import React, { useState } from 'react';
import type { MCQData, ScorePayload } from '../types';

type Props = {
  data: MCQData;
  onAnswer: (p: ScorePayload) => void;
};

export const MCQCard: React.FC<Props> = ({ data, onAnswer }) => {
  const [selected, setSelected] = useState<string>('');

  const handleSubmit = () => {
    if (!selected) return;
    const correct = selected === data.answerKey;
    onAnswer({
      questionId: data.id,
      given: selected,
      correct,
      score: correct ? 1 : 0,
      feedback: correct ? 'Correct!' : `Correct answer was ${data.answerKey}`,
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <p className="mb-4 text-lg font-semibold text-gray-800">{data.question}</p>
      <div className="flex flex-col space-y-3">
        {data.options.map((opt, idx) => {
          const key = String(idx);
          return (
            <label
              key={key}
              className={`flex items-center p-3 rounded-md cursor-pointer transition-all duration-200 ease-in-out
                ${selected === key ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500' : 'bg-gray-50 hover:bg-gray-100 border-gray-300'}
                border`}
            >
              <input
                type="radio"
                name={data.id}
                value={key}
                checked={selected === key}
                onChange={(e) => setSelected(e.target.value)}
                className="form-radio h-5 w-5 text-indigo-600 transition-colors duration-200 focus:ring-indigo-500 mr-3"
              />
              <span className="text-gray-700 text-base">{opt}</span>
            </label>
          );
        })}
      </div>
      <button
        onClick={handleSubmit}
        disabled={!selected}
        className="mt-6 w-full px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        Submit Answer
      </button>
    </div>
  );
};
