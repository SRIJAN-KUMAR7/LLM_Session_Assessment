export function buildPrompt(pdfText: string): string {
  return `You are an impartial assessment-builder.
From the provided document excerpt, create exactly 5 questions that verify the reader's understanding and ability to apply the content.
Output ONLY a valid JSON array of objects.
Each object must have these fields:
- id: string (uuid)
- type: "mcq" | "oneLiner" | "fillBlank"
- topic: string (short category name)
- marks: number (always 1)

For mcq add:
  question, options: string[4], answerKey: string (A|B|C|D)
For oneLiner add:
  question, keywords: string[], caseSensitive: false
For fillBlank add:
  sentence: string (use ___ for blank), acceptable: string[1..3]

Ensure at least one question per type.
Difficulty: intermediate.
Document:
${pdfText}`;
}