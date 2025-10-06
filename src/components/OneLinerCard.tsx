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
    <div className="max-w-xl mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-200 transition-transform transform hover:scale-105 hover:shadow-xl hover:-translate-y-1 duration-200 ease-in-out">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">{data.question}</h2>
      <input
        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 ease-in-out shadow-sm placeholder-gray-400 hover:border-indigo-500 focus:shadow-md"
        placeholder="Type your answer"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="mt-6 w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-lg rounded-xl shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transform hover:shadow-lg"
      >
        Submit Answer
      </button>
    </div>
  );
};
