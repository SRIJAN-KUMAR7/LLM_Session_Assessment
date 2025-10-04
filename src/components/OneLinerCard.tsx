import React, { useState } from 'react';
import type { OneLinerData, ScorePayload } from '../types';

type Props = {
  data: OneLinerData;
  onAnswer: (p: ScorePayload) => void;
};

export const OneLinerCard: React.FC<Props> = ({ data, onAnswer }) => {
  const [value, setValue] = useState('');

  const scoreAnswer = (raw: string): number => {
    const src = data.caseSensitive ? raw : raw.toLowerCase();
    const hits = data.keywords.filter((k) =>
      src.includes(data.caseSensitive ? k : k.toLowerCase())
    ).length;
    return hits / data.keywords.length;
  };

  const handleSubmit = () => {
    const score = scoreAnswer(value.trim());
    onAnswer({
      questionId: data.id,
      given: value,
      correct: score >= 0.8,
      score,
      feedback:
        score >= 0.8
          ? 'Great!'
          : `Missing keywords: ${data.keywords
              .filter((k) => !value.toLowerCase().includes(k.toLowerCase()))
              .join(', ')}`,
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <p className="mb-4 text-lg font-semibold text-gray-800">{data.question}</p>
      <input
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ease-in-out text-gray-700"
        placeholder="Type your answer"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="mt-6 w-full px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        Submit Answer
      </button>
    </div>
  );
};
