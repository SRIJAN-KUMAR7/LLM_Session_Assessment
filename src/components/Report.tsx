import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SkillRadar } from './SkillRadar';
import { buildMetrics, overallScore, weakness, strength, typeAccuracy } from '../lib/reportHelpers';
import type { QuestionUnion, ScorePayload } from '../types';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

type Props = {
  questions: QuestionUnion[];
  scores: Record<string, ScorePayload>;
  candidateName?: string;
};

export function Report({ questions, scores, candidateName = 'Candidate' }: Props) {
  const metrics = buildMetrics(questions, scores);
  const radarData = metrics.map((m) => ({ topic: m.topic, score: m.percentage }));
  const overall = overallScore(metrics);
  const weak = weakness(metrics);
  const strong = strength(metrics);
  const typeStats = typeAccuracy(questions, scores);

  const downloadPDF = async () => {
    const element = document.getElementById('report-card')!;
    const canvas = await html2canvas(element, { backgroundColor: '#ffffff' });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
    while ((heightLeft -= pageHeight) >= 0) {
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, heightLeft - imgHeight, imgWidth, imgHeight);
    }
    pdf.save(`${candidateName.replace(/\s+/g, '_')}_Assessment.pdf`);
  };

  return (
    <motion.div
      className="max-w-5xl mx-auto p-8 bg-gradient-to-br from-white via-gray-50 to-blue-50 rounded-2xl shadow-xl"
      id="report-card"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Knowledge Assessment Report</h1>
          <p className="text-sm text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
          <p className="text-lg font-semibold mt-2 text-indigo-700">Candidate: {candidateName}</p>
        </div>
        <div className="text-right">
          <div className={`text-5xl font-extrabold ${overall >= 70 ? 'text-blue-600' : 'text-red-600'}`}>
            {overall}%
          </div>
          <div className="text-sm text-gray-500 font-medium">Overall Accuracy</div>
        </div>
      </div>

      {/* Question Type Accuracy */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'MCQ Accuracy', value: typeStats.mcq, color: 'from-green-400 to-emerald-600' },
          { label: 'One-liner Accuracy', value: typeStats.oneLiner, color: 'from-blue-400 to-indigo-600' },
          { label: 'Short Answer Accuracy', value: typeStats.fillBlank, color: 'from-amber-400 to-orange-600' },
        ].map((card, idx) => (
          <motion.div
            key={idx}
            className={`p-4 rounded-xl shadow-md bg-gradient-to-r ${card.color} text-white text-center`}
            whileHover={{ scale: 1.03 }}
          >
            <div className="text-4xl font-bold">{card.value}%</div>
            <div className="text-sm uppercase tracking-wide mt-1">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Radar */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Skill Radar</h2>
        <SkillRadar data={radarData} />
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-green-50 p-4 rounded-lg shadow-inner border border-green-200">
          <h3 className="text-md font-semibold text-green-700 mb-2">Strengths</h3>
          {strong.length ? (
            <ul className="list-disc ml-6 text-gray-800">
              {strong.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No clear strengths identified.</p>
          )}
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow-inner border border-red-200">
          <h3 className="text-md font-semibold text-red-700 mb-2">Areas Needing Improvement</h3>
          {weak.length ? (
            <ul className="list-disc ml-6 text-gray-800">
              {weak.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Excellent — no significant gaps.</p>
          )}
        </div>
      </div>

      {/* Evidence Table */}
      <div className="mb-8">
        <h3 className="text-md font-semibold text-gray-800 mb-3">Detailed Evaluation</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-4 py-2">Topic</th>
                <th className="px-4 py-2">Question</th>
                <th className="px-4 py-2">Response</th>
                <th className="px-4 py-2">Feedback</th>
                <th className="px-4 py-2 text-center">Result</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) =>
                m.evidence.map((ev, idx) => (
                  <tr
                    key={`${m.topic}-${idx}`}
                    className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50 transition-colors"
                  >
                    <td className="px-4 py-2 font-medium text-gray-800">{m.topic}</td>
                    <td className="px-4 py-2 max-w-xs truncate" title={ev.q}>
                      {ev.q}
                    </td>
                    <td className="px-4 py-2 text-gray-700" title={ev.given}>
                      {ev.given}
                    </td>
                    <td className="px-4 py-2 text-gray-600" title={ev.feedback}>
                      {ev.feedback}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {ev.feedback.toLowerCase().includes('correct') ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500 inline" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-500 inline" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={downloadPDF}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow transition-all"
        >
          Download PDF
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-all"
        >
          Start New Assessment
        </button>
      </div>
    </motion.div>
  );
}
