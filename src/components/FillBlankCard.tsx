import React, { useState } from 'react';
import type { FillBlankData, ScorePayload } from '../types';

type Props = {
  data: FillBlankData;
  onAnswer: (p: ScorePayload) => void;
};

export const FillBlankCard: React.FC<Props> = ({ data, onAnswer }) => {
  const [value, setValue] = useState('');

  const isCorrect = (v: string) =>
    data.acceptable
      .map((a) => a.toLowerCase())
      .includes(v.trim().toLowerCase());

  const handleSubmit = () => {
    const correct = isCorrect(value);
    onAnswer({
      questionId: data.id,
      given: value,
      correct,
      score: correct ? 1 : 0,
      feedback: correct ? 'Correct!' : `Accepted answers: ${data.acceptable.join(', ')}`,
    });
  };

  const parts = data.sentence.split('___');

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <p className="mb-4 text-lg font-semibold text-gray-800">
        {parts[0]}
        <input
          className="mx-2 px-3 py-2 border-b-2 border-indigo-500 outline-none focus:border-indigo-700 transition-colors duration-200 text-gray-700"
          placeholder="....."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ minWidth: '100px' }}
        />
        {parts[1]}
      </p>
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
