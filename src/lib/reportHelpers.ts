import type { QuestionUnion, ScorePayload } from '../types';

export interface TopicMetric {
  topic: string;
  totalQs: number;
  correct: number;
  percentage: number;
  evidence: { q: string; given: string; feedback: string }[];
}

export function buildMetrics(
  questions: QuestionUnion[],
  scores: Record<string, ScorePayload>
): TopicMetric[] {
  const map = new Map<string, TopicMetric>();
  questions.forEach((q) => {
    const s = scores[q.id];
    if (!s) return;
    const curr = map.get(q.topic) ?? {
      topic: q.topic,
      totalQs: 0,
      correct: 0,
      percentage: 0,
      evidence: [],
    };
    curr.totalQs++;
    if (s.correct) curr.correct++;
    curr.evidence.push({
      q:
        q.type === 'mcq'
          ? q.question
          : q.type === 'oneLiner'
          ? q.question
          : q.sentence,
      given: s.given,
      feedback: s.feedback ?? '',
    });
    map.set(q.topic, curr);
  });

  return Array.from(map.values()).map((m) => ({
    ...m,
    percentage: Math.round((m.correct / m.totalQs) * 100),
  }));
}

export function overallScore(metrics: TopicMetric[]) {
  const total = metrics.reduce((s, m) => s + m.percentage, 0);
  return metrics.length ? Math.round(total / metrics.length) : 0;
}

export function weakness(metrics: TopicMetric[]): string[] {
  return metrics.filter((m) => m.percentage < 60).map((m) => m.topic);
}

export function strength(metrics: TopicMetric[]): string[] {
  return metrics.filter((m) => m.percentage >= 80).map((m) => m.topic);
}