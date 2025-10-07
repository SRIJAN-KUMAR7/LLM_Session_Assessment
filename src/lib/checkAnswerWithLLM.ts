const API_KEY = import.meta.env.VITE_GEMINI_KEY;

export async function checkAnswerWithLLM({
  userAnswer,
  acceptedAnswers,
  question,
}: {
  userAnswer: string;
  acceptedAnswers: string[];
  question?: string;
}) {
  const prompt = `
You are an intelligent quiz evaluator.
Your job is to determine if the user's answer is semantically and logically correct.
Case, synonyms, or minor spelling differences should be ignored.
If the answer MEANS the same as any accepted answer, mark it correct.

Return ONLY a JSON object:
{
  "result": "CORRECT" | "INCORRECT",
  "reason": "<short explanation>"
}

Question: ${question ?? "N/A"}
User Answer: "${userAnswer}"
Accepted Answers: ${acceptedAnswers.map((a) => `"${a}"`).join(", ")}
`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 1,
            maxOutputTokens: 4000,
          },
        }),
      },
    );
    console.log("inside LLM call")
    console.log(res)
    if (!res.ok) throw new Error('Gemini HTTP ' + res.status + res);
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Parse the JSON from the response text
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const jsonStr =
      jsonStart !== -1 && jsonEnd !== -1
        ? text.slice(jsonStart, jsonEnd + 1)
        : "{}";

    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("LLM Check Error:", err);
    return { result: "INCORRECT", reason: "Error evaluating answer" };
  }
}