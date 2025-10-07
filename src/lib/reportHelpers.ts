
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

  for (const q of questions) {
    const s = scores[q.id];
    if (!s) {
      console.debug(`[METRICS] missing score for q=${q.id}`);
      continue;
    }
    const curr =
      map.get(q.topic) ??
      { topic: q.topic, totalQs: 0, correct: 0, percentage: 0, evidence: [] };

    curr.totalQs += 1;
    if (s.correct) curr.correct += 1;

    const qText = q.type === 'mcq' || q.type === 'oneLiner' ? q.question : q.sentence;
    curr.evidence.push({ q: qText, given: s.given, feedback: s.feedback ?? '' });
    map.set(q.topic, curr);
  }

  const metrics = Array.from(map.values()).map((m) => ({
    ...m,
    percentage: m.totalQs ? Math.round((m.correct / m.totalQs) * 100) : 0,
  }));

  console.debug('[METRICS] topic breakdown:', metrics);
  return metrics;
}

export function overallScore(metrics: TopicMetric[]): number {
  if (!metrics.length) return 0;
  const total = metrics.reduce((acc, m) => acc + m.percentage, 0);
  const overall = Math.round(total / metrics.length);
  console.debug('[METRICS] overall:', overall);
  return overall;
}

export function weakness(metrics: TopicMetric[]): string[] {
  return metrics.filter((m) => m.percentage < 60).map((m) => m.topic);
}

export function strength(metrics: TopicMetric[]): string[] {
  return metrics.filter((m) => m.percentage >= 80).map((m) => m.topic);
}

export function typeAccuracy(
  questions: QuestionUnion[],
  scores: Record<string, ScorePayload>
) {
  const summary = {
    mcq: { total: 0, correct: 0 },
    oneLiner: { total: 0, correct: 0 },
    fillBlank: { total: 0, correct: 0 },
  };

  for (const q of questions) {
    const s = scores[q.id];
    if (!s) continue;
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
  }

  const pct = (c: number, t: number) => (t ? Math.round((c / t) * 100) : 0);
  const result = {
    mcq: pct(summary.mcq.correct, summary.mcq.total),
    oneLiner: pct(summary.oneLiner.correct, summary.oneLiner.total),
    fillBlank: pct(summary.fillBlank.correct, summary.fillBlank.total),
  };
  console.debug('[METRICS] type accuracy:', { summary, result });
  return result;
}
