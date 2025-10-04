import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SkillRadar } from './SkillRadar';
import { buildMetrics, overallScore, weakness, strength } from '../lib/reportHelpers';
import type { QuestionUnion, ScorePayload } from '../types';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

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

  // Export PDF
  const downloadPDF = async () => {
    const element = document.getElementById('report-card')!;
    const canvas = await html2canvas(element, { backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(`${candidateName.replace(/\s+/g, '_')}_Assessment.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded" id="report-card">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Assessment Report</h1>
          <p className="text-sm text-gray-500">Generated {new Date().toLocaleDateString()}</p>
          <p className="text-lg font-semibold mt-2">Candidate: {candidateName}</p>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-bold ${overall >= 70 ? 'text-green-600' : 'text-red-600'}`}>
            {overall}%
          </div>
          <div className="text-sm text-gray-500">Overall Score</div>
        </div>
      </div>

      {/* Radar */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Skill Radar</h2>
        <SkillRadar data={radarData} />
      </div>

      {/* Strengths & Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-md font-semibold text-green-700">Strengths</h3>
          {strong.length ? (
            <ul className="list-disc ml-6">
              {strong.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No clear strengths identified.</p>
          )}
        </div>
        <div>
          <h3 className="text-md font-semibold text-red-700">Areas Needing Improvement</h3>
          {weak.length ? (
            <ul className="list-disc ml-6">
              {weak.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Great job — no significant gaps.</p>
          )}
        </div>
      </div>

      {/* Evidence Table */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-2">Detailed Evidence</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Topic</th>
                <th className="px-3 py-2 text-left">Question / Task</th>
                <th className="px-3 py-2 text-left">Candidate Response</th>
                <th className="px-3 py-2 text-left">Feedback</th>
                <th className="px-3 py-2 text-center">Result</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.map((m) =>
                m.evidence.map((ev, idx) => (
                  <tr key={`${m.topic}-${idx}`}>
                    <td className="px-3 py-2 whitespace-nowrap">{m.topic}</td>
                    <td className="px-3 py-2 max-w-xs truncate" title={ev.q}>
                      {ev.q}
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate" title={ev.given}>
                      {ev.given}
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate" title={ev.feedback}>
                      {ev.feedback}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {ev.feedback.toLowerCase().includes('correct') ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-600 inline" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-600 inline" />
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
      <div className="flex gap-3">
        <button
          onClick={downloadPDF}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Download PDF
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Start New Assessment
        </button>
      </div>
    </div>
  );
}