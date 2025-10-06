import type { QuestionUnion, ScorePayload } from '../types';

export interface TopicMetric {
  topic: string;
  totalQs: number;
  correct: number;
  percentage: number;
  evidence: { q: string; given: string; feedback: string }[];
}

/**
 * Build metrics per topic
 */
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

    // Decide question text based on type
    const qText =
      q.type === 'mcq' || q.type === 'oneLiner' ? q.question : q.sentence;

    curr.evidence.push({
      q: qText,
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

/**
 * Overall score across all topics
 */
export function overallScore(metrics: TopicMetric[]): number {
  const total = metrics.reduce((s, m) => s + m.percentage, 0);
  return metrics.length ? Math.round(total / metrics.length) : 0;
}

/**
 * Weak topics (<60%)
 */
export function weakness(metrics: TopicMetric[]): string[] {
  return metrics.filter((m) => m.percentage < 60).map((m) => m.topic);
}

/**
 * Strong topics (>=80%)
 */
export function strength(metrics: TopicMetric[]): string[] {
  return metrics.filter((m) => m.percentage >= 80).map((m) => m.topic);
}

/**
 * Accuracy per question type
 */
export function typeAccuracy(
  questions: QuestionUnion[],
  scores: Record<string, ScorePayload>
) {
  const summary = {
    mcq: { total: 0, correct: 0 },
    oneLiner: { total: 0, correct: 0 },
    fillBlank: { total: 0, correct: 0 },
  };

  questions.forEach((q) => {
    const s = scores[q.id];
    if (!s) return;

    if (q.type === 'mcq') {
      summary.mcq.total++;
      if (s.correct) summary.mcq.correct++;
    } else if (q.type === 'oneLiner') {
      summary.oneLiner.total++;
      if (s.correct) summary.oneLiner.correct++;
    } else if (q.type === 'fillBlank') {
      summary.fillBlank.total++;
      if (s.correct) summary.fillBlank.correct++;
    }
  });

  const percent = (correct: number, total: number) =>
    total ? Math.round((correct / total) * 100) : 0;

  return {
    mcq: percent(summary.mcq.correct, summary.mcq.total),
    oneLiner: percent(summary.oneLiner.correct, summary.oneLiner.total),
    fillBlank: percent(summary.fillBlank.correct, summary.fillBlank.total),
  };
}
