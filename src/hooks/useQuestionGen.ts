import { useState } from 'react';
import { pdfToText } from '../lib/pdfParser';
import { generateQuestions } from '../lib/generator';
import type { QuestionUnion } from '../types';

export function useQuestionGen() {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuestionUnion[]>([]);
  const [error, setError] = useState('');

  const run = async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const text = await pdfToText(file);
      const qs = await generateQuestions(text);
      console.log({...qs});
      setQuestions(qs);
    } catch (e: any) {
      setError(e.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return { run, questions, loading, error };
}