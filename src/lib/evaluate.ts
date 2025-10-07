type Verdict = {
  correct: boolean;
  feedback: string;
  score: number; // from 0 to 1 indicating closeness/partial credit
};

const API_KEY = import.meta.env.VITE_GEMINI_KEY;  // use server env var
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Builds LLM prompt with grading instructions and context
function buildPrompt(
  question: any,
  answer: string,
  answerKey?: string,
  keywords?: string[]
): string {
  const qText =typeof question === 'string' ? question : JSON.stringify(question, null, 2);
  return [
    "You are an experienced, objective, and kind human grader for exam answers.",
    "For each candidate answer, output a valid JSON ONLY with the keys:",
    "- correct: true or false (true if the answer is fully correct)",
    "- feedback: a constructive and encouraging text explaining what was right or missing",
    "- score: a number from 0 to 1 indicating how close the answer is to the ideal answer (partial credit)",
    "Grading rules:",
    "- For MCQs, correct means exact match with answerKey; score is 1 for exact, 0 for wrong.",
    "- For one-liner and fill-in-the-blank answers:",
    "  - Compare for semantic equivalence, ignoring punctuation and case.",
    "  - Look for presence of keywords. If some keywords missing, deduct partial credit proportional to missing keywords.",
    "  - Accept minor formatting or synonyms as correct or mostly correct.",
    "- Provide detailed feedback mentioning any keywords missing or mistakes.",
    "Question:",
    qText,
    answerKey ? `Reference answer: ${answerKey}` : "",
    keywords && keywords.length ? `Expected keywords: ${keywords.join(', ')}` : "",
    "Candidate answer:",
    answer,
    "Return JSON now."
  ].filter(Boolean).join('\n');
}

interface data {
  question: {
    id: string;
    type: string;
    topic: string;
    question: string;
    answerKey: string;
    keywords: string[];
  };
  answer: string;
}

// Grading function that calls Gemini LLM API
export const grading = async (data: data): Promise<Verdict | void> => {
  try {
    if (!data || typeof data.answer !== 'string') {
      console.log('Invalid request payload');
      return;
    }

    if (!API_KEY) {
      console.error('Missing GEMINI_API_KEY');
      return;
    }

    const { question, answer } = data;
    const { answerKey, keywords } = question;

    const prompt = buildPrompt(question, answer, answerKey, keywords);

    const res = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 512
        }
      }),
    });

    if (!res.ok) {
      console.log('Model request failed:', await res.text());
      return;
    }

    const json = await res.json();

    // safely extract model output text with fallback options
    let rawOutput: string | undefined =
      json?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text ??
      json?.candidates?.[0]?.output ??
      json?.output?.[0]?.content?.[0]?.parts?.[0]?.text ??
      json?.output?.[0]?.text ??
      json?.text ??
      JSON.stringify(json);

    if (typeof rawOutput !== 'string') rawOutput = String(rawOutput);

    // parse the JSON verdict from raw output
    let verdict: Verdict | null = null;
    try {
      verdict = JSON.parse(rawOutput);
    } catch {
      const match = rawOutput.match(/\{[\s\S]*?\}/);
      if (match) {
        try {
          verdict = JSON.parse(match[0]);
        } catch {
          verdict = null;
        }
      }
    }

    if (!verdict) {
      console.log('Unable to parse verdict from model output:', rawOutput);
      return;
    }

    // Normalize verdict data
    const normalized: Verdict = {
      correct: Boolean(verdict.correct),
      feedback: String(verdict.feedback ?? '').trim(),
      score: Math.max(0, Math.min(1, verdict.score ?? (verdict.correct ? 1 : 0))),
    };

    console.log('verdict: ', normalized);
    return normalized;
  } catch (err: any) {
    console.error('Error during grading:', err);
  }
};
