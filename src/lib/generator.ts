import { askGemini } from './llm';
import { buildPrompt } from './prompt';
import type { QuestionUnion } from '../types';

export async function generateQuestions(pdfText: string): Promise<QuestionUnion[]> {
    const prompt = buildPrompt(pdfText);
    const raw = await askGemini(prompt);

    const cleaned = raw
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

    const match = cleaned.match(/(\[.*\])/s);
    if (!match) throw new Error('No JSON array found in Gemini response');

    try {
        const arr = JSON.parse(match[0]) as QuestionUnion[];
        if (!Array.isArray(arr)) throw new Error('Top-level is not array');
        return arr.slice(0, 10);
    } catch (e) {
        console.error('Bad JSON slice', match[0]);
        throw new Error('Malformed JSON from Gemini');
    }
}
