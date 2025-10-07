// MCQCard.tsx (replace current file)
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { MCQData, ScorePayload } from '../types';

type Props = {
  data: MCQData;
  onAnswer: (p: ScorePayload) => void;
};

export const MCQCard: React.FC<Props> = ({ data, onAnswer }) => {
  const [selected, setSelected] = useState<string>(''); // will store 'A' | 'B' | 'C' ...

  const handleSubmit = () => {
    if (!selected) return;
    const correct = selected.toUpperCase() === String(data.answerKey).toUpperCase();
    onAnswer({
      questionId: data.id,
      answer: selected, // store letter (e.g. 'B')
      correct,
      score: correct ? 1 : 0,
      feedback: correct ? 'Correct!' : `Correct answer was ${data.answerKey}`,
      llmConfirmed: undefined
    });
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white rounded-2xl shadow-xl border border-gray-200">
      <p className="mb-6 text-2xl font-semibold text-gray-900">{data.question}</p>

      <div className="flex flex-col space-y-4">
        {data.options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx); // 'A', 'B', ...
          const isSelected = selected === letter;
          // keep opt text as-is (you already store 'A) text' optionally)
          const display = opt.startsWith(`${letter})`) ? opt : `${letter}) ${opt}`;

          return (
            <motion.label
              key={letter}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
              className={`flex items-center p-4 rounded-xl cursor-pointer select-none border transition-all duration-300 ease-in-out shadow-sm
                ${isSelected
                  ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500 scale-105 shadow-indigo-300'
                  : 'bg-gray-50 hover:bg-gray-100 border-gray-300'
                }`}
            >
              <input
                type="radio"
                name={data.id}
                value={letter}
                checked={isSelected}
                onChange={() => setSelected(letter)}
                className="form-radio h-6 w-6 text-indigo-600 focus:ring-indigo-500 mr-4"
              />
              <span className="text-gray-800 text-lg font-medium">{display}</span>
            </motion.label>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selected}
        className="mt-8 w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-2xl shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-200 hover:scale-105"
      >
        Submit Answer
      </button>
    </div>
  );
};
