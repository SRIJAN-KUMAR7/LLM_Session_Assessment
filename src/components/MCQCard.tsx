import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { MCQData, ScorePayload } from '../types';

type Props = {
  data: MCQData;
  onAnswer: (p: ScorePayload) => void;
};

const MotionLabel = motion('label');

export const MCQCard: React.FC<Props> = ({ data, onAnswer }) => {
  const [selected, setSelected] = useState<string>('');

  const handleSubmit = () => {
    if (!selected) return;
    const correct = selected === String(data.answerKey);
    onAnswer({
      questionId: data.id,
      given: selected,
      correct,
      score: correct ? 1 : 0,
      feedback: correct ? 'Correct!' : `Correct answer was ${data.answerKey}`,
    });
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white rounded-2xl shadow-xl border border-gray-200">
      <p className="mb-6 text-2xl font-semibold text-gray-900">{data.question}</p>
      
      <div className="flex flex-col space-y-4">
        {data.options.map((opt, idx) => {
          const key = String(idx);
          const isSelected = selected === key;
          return (
            <MotionLabel
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className={`flex items-center p-4 rounded-xl cursor-pointer select-none border 
                transition-all duration-300 ease-in-out shadow-sm
                ${isSelected
                  ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500 scale-105 shadow-indigo-300'
                  : 'bg-gray-50 hover:bg-gray-100 border-gray-300'
                }
              `}
              whileHover={{ 
                scale: 1.03, 
                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
              }}
            >
              <input
                type="radio"
                name={data.id}
                value={key}
                checked={isSelected}
                onChange={() => setSelected(key)}
                className="form-radio h-6 w-6 text-indigo-600 focus:ring-indigo-500 mr-4"
              />
              <span className="text-gray-800 text-lg font-medium">{opt}</span>
            </MotionLabel>
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