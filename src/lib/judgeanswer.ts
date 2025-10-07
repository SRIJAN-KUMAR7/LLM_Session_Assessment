// lib/judgeAnswer.ts
import type { QuestionUnion, ScorePayload } from '../types';

function normalizeGeneral(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');
}

function normalizeDateLike(str: string): string {
  // “23-July-2025” == “23 July 2025” == “23/07/2025” by stripping non-alphanumerics and lowercasing
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function roughlyEquals(a: string, b: string): boolean {
  if (!a || !b) return false;
  // try date-like first
  const da = normalizeDateLike(a);
  const db = normalizeDateLike(b);
  if (da && db && da === db) return true;

  // fallback general
  return normalizeGeneral(a) === normalizeGeneral(b);
}

function numericClose(a: string, b: string, eps = 1e-6): boolean {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) {
    return Math.abs(na - nb) <= eps;
  }
  return false;
}

export async function judgeAnswer(q: QuestionUnion, userAnswer: string): Promise<ScorePayload> {
  let correct = false;
  let feedback = '';
  let score = 0;
  const expected = (q as any).answerKey as string | undefined;

  // MCQ: exact key match after normalization
  if (q.type === 'mcq' && expected) {
    correct = roughlyEquals(userAnswer, expected);
    feedback = correct ? 'Correct!' : `Expected: ${expected}`;
  }
  // Deterministic check when answerKey exists (oneLiner/fillBlank too)
  else if (expected) {
    correct = roughlyEquals(userAnswer, expected) || numericClose(userAnswer, expected);
    feedback = correct ? 'Correct!' : `Expected similar to "${expected}"`;
  }
  // No ground truth -> LLM fallback
  else {
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, answer: userAnswer }),
      });
      const verdict = await res.json();
      correct = Boolean(verdict.correct);
      feedback = String(verdict.feedback ?? '').trim();
    } catch {
      feedback = 'Evaluation failed.';
    }
  }

  score = correct ? (q.marks ?? 1) : 0;

  return {
    questionId: q.id,
    answer: userAnswer,
    correct,
    score,
    feedback,
  };
}
