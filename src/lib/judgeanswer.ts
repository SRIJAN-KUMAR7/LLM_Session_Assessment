import type { QuestionUnion, ScorePayload } from '../types';

function normalize(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');
}
export async function judgeAnswer(q: QuestionUnion, userAnswer: string): Promise<ScorePayload> {
  const normalizedUser = normalize(userAnswer);
  let correct = false;
  let feedback = '';
  let score = 0; 
  if (q.type === 'mcq') {
    correct = normalizedUser === normalize(q.answerKey);
    feedback = correct ? 'Correct answer!' : `Expected: ${q.answerKey}`;
  } 
  else if (q.answerKey) {
    correct = normalizedUser === normalize(q.answerKey);
    feedback = correct ? 'Correct explanation.' : `Expected something like "${q.answerKey}"`;
  } 
  else {
    const verdict = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: q,
        answer: userAnswer,
      }),
    }).then((r) => r.json());

    correct = verdict.correct;
    feedback = verdict.feedback;
  }
  score = correct ? (q.marks ?? 1) : 0;
  return {
    questionId: q.id,
    given: userAnswer,
    correct,
    score,
    feedback,
  };
}
