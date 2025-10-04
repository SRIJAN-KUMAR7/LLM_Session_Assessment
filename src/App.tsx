import { useState } from 'react';
import { useQuestionGen } from './hooks/useQuestionGen';
import { QuestionFactory } from './components/QuestionFactory';
import type { ScorePayload } from './types';
import { Report } from './components/Report';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const { run, questions, loading, error } = useQuestionGen();
  const [scores, setScores] = useState<Record<string, ScorePayload>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const handleAnswer = (p: ScorePayload) => {
    setScores((prev) => ({ ...prev, [p.questionId]: p }));
  };

  const totalQ = questions.length;
  const answered = Object.keys(scores).length;
  const currentQuestion = questions[currentQuestionIndex];

  const handleNext = () => {
    if (currentQuestionIndex < totalQ - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-gradient-to-r from-indigo-700 to-indigo-500 text-white py-8 px-6 shadow-lg">
        <h1 className="text-4xl font-extrabold tracking-tight">Sales Knowledge Analyzer</h1>
        <p className="text-lg opacity-90 mt-2">Upload a playbook PDF and get 10 auto-generated questions</p>
      </header>

      <section className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Upload Zone */}
        {!totalQ && (
          <div
            className="relative border-2 border-dashed border-indigo-400 rounded-xl p-10 text-center cursor-pointer hover:bg-indigo-50 transition-all duration-200 ease-in-out group shadow-md"
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file && file.type === 'application/pdf') run(file);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) run(file);
              }}
            />
            <label htmlFor="pdf-upload" className="cursor-pointer w-full h-full absolute inset-0 flex flex-col items-center justify-center">
              {loading ? (
                <span className="text-indigo-600 text-xl font-semibold animate-pulse">Generating questions…</span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-500 group-hover:text-indigo-700 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="font-semibold text-lg mt-2 text-gray-700 group-hover:text-indigo-800">Drop playbook PDF here or click to select</p>
                  <p className="text-sm text-gray-500 mt-1">Only PDFs {'<'} 5 MB</p>
                </>
              )}
            </label>
            {error && <p className="text-red-600 mt-4 text-sm">{error}</p>}
          </div>
        )}

        {/* Questions */}
        {totalQ > 0 && answered < totalQ && (
          <div className="mt-8 p-6 bg-white rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Question {currentQuestionIndex + 1} of {totalQ}
            </h2>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion?.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                {currentQuestion && (
                  <QuestionFactory
                    key={currentQuestion.id}
                    question={currentQuestion}
                    onAnswer={(p) => {
                      handleAnswer(p);
                      // Automatically move to the next question after answering
                      if (currentQuestionIndex < totalQ - 1) {
                        setTimeout(() => handleNext(), 500); // Small delay for animation
                      }
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
            <div className="flex justify-between mt-6">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-2 bg-gray-300 text-gray-800 font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentQuestionIndex === totalQ - 1 || !scores[currentQuestion?.id || '']}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {currentQuestionIndex === totalQ - 1 ? 'Finish Assessment' : 'Next Question'}
              </button>
            </div>
          </div>
        )}

        {/* Mini Report */}
        {answered === totalQ && totalQ > 0 && (
          <div className="mt-8">
            <Report questions={questions} scores={scores} candidateName="Candidate" />
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
