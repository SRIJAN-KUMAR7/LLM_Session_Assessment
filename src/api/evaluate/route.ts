import { NextResponse } from 'next/server';

type EvalRequest = {
  question: any;
  answer: string;
};

type Verdict = {
  correct: boolean;
  feedback: string;
  score: number;
};

const API_KEY = import.meta.env.VITE_GEMINI_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function buildPrompt(question: any, answer: string) {
  const qText = typeof question === 'string' ? question : JSON.stringify(question, null, 2);
  return [
    `You are an objective grader for short answers / one-line answers.`,
    `Output must be valid JSON only with keys: correct (boolean), feedback (string), score (number 0..1).`,
    `Rules:`,
    `- If the question object contains an "answerKey" or "keywords", prioritize those.`,
    `- If "keywords" exists, check case-insensitively whether the answer contains them; if missing list missing keywords and give partial credit.`,
    `- If answerKey exists, accept normalized matches (lowercase, remove spaces/punctuation) as correct.`,
    `- If no ground truth available, judge using professional reasoning.`,
    ``,
    `Question:`,
    qText,
    ``,
    `Candidate answer:`,
    answer,
    ``,
    `Return JSON now.`
  ].join('\n');
}

export async function POST(req: Request) {
  try {
    const body: EvalRequest = await req.json();

    if (!body || typeof body.answer !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Missing GOOGLE_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // ----- Gemini API request -----
    const prompt = buildPrompt(body.question, body.answer);
    const res = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 512
        }
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: 'Model request failed', details: text }, { status: 502 });
    }

    const json = await res.json();

    // Safely extract model output text
    let rawOutput = json?.candidates?.[0]?.content?.parts?.[0]?.text
      ?? json?.candidates?.[0]?.output
      ?? json?.output?.[0]?.content?.[0]?.text
      ?? json?.output?.[0]?.text
      ?? json?.text
      ?? JSON.stringify(json);

    if (typeof rawOutput !== 'string') rawOutput = String(rawOutput);

    // Parse JSON output from Gemini; fallback to extracting inline JSON
    let verdict: Verdict | null = null;
    try {
      verdict = JSON.parse(rawOutput);
    } catch (e) {
      const match = rawOutput.match(/\{[\s\S]*?\}/);
      if (match) {
        try {
          verdict = JSON.parse(match[0]);
        } catch {}
      }
    }

    if (!verdict) {
      return NextResponse.json(
        {
          correct: false,
          feedback:
            'Unable to parse model response. Please check model output or adjust prompt. Raw response: ' + rawOutput,
          score: 0,
        },
        { status: 502 }
      );
    }

    // Normalize verdict types
    const normalized: Verdict = {
      correct: Boolean(verdict.correct),
      feedback: String(verdict.feedback ?? '').trim(),
      score:
        typeof verdict.score === 'number'
          ? Math.max(0, Math.min(1, verdict.score))
          : verdict.correct
          ? 1
          : 0,
    };

    return NextResponse.json(normalized);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
