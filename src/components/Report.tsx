import { useMemo, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';

import { checkAnswerWithLLM } from '../lib/checkAnswerWithLLM';
import {
  CheckCircleIcon,
  XCircleIcon,
  TrophyIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/solid';
import type { FillBlankData, QuestionUnion, ScorePayload } from '../types';

const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

type Props = {
  questions: QuestionUnion[];
  scores: Record<string, ScorePayload>;
  candidateName?: string;
  timeSpent?: number;
};



function PerformanceBadge({ score }: { score: number }) {
  let badgeClass = 'px-3 py-1 rounded-full text-sm font-semibold ';
  let text = '';
  if (score >= 90) { badgeClass += 'bg-green-100 text-green-800'; text = 'Excellent'; }
  else if (score >= 80) { badgeClass += 'bg-blue-100 text-blue-800'; text = 'Very Good'; }
  else if (score >= 70) { badgeClass += 'bg-yellow-100 text-yellow-800'; text = 'Good'; }
  else if (score >= 60) { badgeClass += 'bg-orange-100 text-orange-800'; text = 'Average'; }
  else { badgeClass += 'bg-red-100 text-red-800'; text = 'Needs Improvement'; }
  return <span className={badgeClass}>{text}</span>;
}

export default function ReportUI({ questions, scores: initialScores, candidateName = 'Candidate', timeSpent }: Props) {
  const [scores, setScores] = useState(initialScores);
  const [isChecking, setIsChecking] = useState(false);
  // Auto-check One-liner / Fill-blank answers with LLM for confirmation
useEffect(() => {
  const toCheck = questions.filter(
    q => (q.type === 'oneLiner' || q.type === 'fillBlank') && 
         scores[q.id]?.answer && // Only check if there's an answer
         !scores[q.id]?.llmConfirmed // Only check if not already LLM confirmed
  );

  if (toCheck.length === 0) return;

  const checkAll = async () => {
    setIsChecking(true);
    const updatedScores = { ...scores };

    for (const q of toCheck) {
      try {
        const userAnswer = updatedScores[q.id]?.answer || '';
        let acceptedAnswers: string[] = [];

        if (q.type === 'oneLiner') {
          acceptedAnswers = (q as any).acceptedAnswers || [];
        } else if (q.type === 'fillBlank') {
          acceptedAnswers = [(q as FillBlankData).correctAnswer];
        }

        const questionText = q.type === 'fillBlank' 
          ? (q as FillBlankData).sentence 
          : (q as any).question;

        const result = await checkAnswerWithLLM({ 
          userAnswer, 
          acceptedAnswers, 
          question: questionText 
        });

        updatedScores[q.id] = {
          ...updatedScores[q.id],
          correct: result.result === 'CORRECT',
          score: result.result === 'CORRECT' ? 1 : 0,
          feedback: result.reason || (result.result === 'CORRECT' ? 'Answer is correct' : 'Answer needs improvement'),
          llmConfirmed: true // Mark as LLM confirmed
        };
      } catch (error) {
        console.error(`Error checking answer for question ${q.id}:`, error);
        // If LLM check fails, mark as confirmed to avoid repeated attempts
        updatedScores[q.id] = {
          ...updatedScores[q.id],
          llmConfirmed: true
        };
      }
    }

    setScores(updatedScores);
    setIsChecking(false);
  };

  checkAll();
}, [questions, initialScores]);
 
  // The rest of your existing useMemo metrics calculation stays the same
  const { metrics, overall, typeStats, topicPerformance, completionRate, correctAnswers } = useMemo(() => {
    const topicMap: Record<string, { total: number; sumScore: number; correct: number; evidence: any[] }> = {};
    const typeMap: Record<string, { total: number; sumScore: number }> = { mcq: { total: 0, sumScore: 0 }, oneLiner: { total: 0, sumScore: 0 }, fillBlank: { total: 0, sumScore: 0 } };

    let answered = 0;

    for (const q of questions) {
      const sc = scores[q.id];
      const qScore = sc ? (typeof sc.score === 'number' ? sc.score : (sc.correct ? 1 : 0)) : 0;
      const percent = Math.round(qScore * 100);
      const topic = q.topic || 'General';
      if (!topicMap[topic]) topicMap[topic] = { total: 0, sumScore: 0, correct: 0, evidence: [] };

      topicMap[topic].total += 1;
      topicMap[topic].sumScore += (qScore * 100);
      if (sc && sc.correct) topicMap[topic].correct += 1;
      topicMap[topic].evidence.push({ q: q.type === 'fillBlank' ? (q as FillBlankData).sentence : (q as any).question, given: sc?.answer ?? '-', feedback: sc?.feedback ?? '-', score: percent, correct: !!sc?.correct });

      // type stats
      const t = q.type;
      if (!typeMap[t]) typeMap[t] = { total: 0, sumScore: 0 };
      typeMap[t].total += 1;
      typeMap[t].sumScore += (qScore * 100);

      if (sc) answered += 1;
    }

    const topics = Object.keys(topicMap).map((topic) => {
      const t = topicMap[topic];
      const avg = t.total ? Math.round(t.sumScore / t.total) : 0;
      return { topic, percentage: avg, totalQs: t.total, correct: t.correct, evidence: t.evidence };
    });

    const overallScore = topics.length ? Math.round(topics.reduce((s, x) => s + x.percentage, 0) / topics.length) : 0;

    const tStats = {
      mcq: typeMap.mcq.total ? Math.round(typeMap.mcq.sumScore / typeMap.mcq.total) : 0,
      oneLiner: typeMap.oneLiner.total ? Math.round(typeMap.oneLiner.sumScore / typeMap.oneLiner.total) : 0,
      fillBlank: typeMap.fillBlank.total ? Math.round(typeMap.fillBlank.sumScore / typeMap.fillBlank.total) : 0,
    };

    const completion = questions.length ? Math.round((answered / questions.length) * 100) : 0;
    const correctCount = Object.values(scores).filter(s => s.correct).length;

    return { metrics: topics, overall: overallScore, typeStats: tStats, topicPerformance: topics, completionRate: completion, correctAnswers: correctCount };
  }, [questions, scores]);

  // simple grouping for strengths and weaknesses
  const strengths = useMemo(() => metrics.filter(m => m.percentage >= 80).map(m => m.topic), [metrics]);
  const weaknesses = useMemo(() => metrics.filter(m => m.percentage < 60).map(m => m.topic), [metrics]);

  // pie data for question type distribution
  const questionTypeDistribution = useMemo(() => {
    const mcq = questions.filter(q => q.type === 'mcq').length;
    const one = questions.filter(q => q.type === 'oneLiner').length;
    const fb = questions.filter(q => q.type === 'fillBlank').length;
    const arr = [] as { name: string; value: number }[];
    if (mcq) arr.push({ name: 'MCQ', value: mcq });
    if (one) arr.push({ name: 'One-liner', value: one });
    if (fb) arr.push({ name: 'Short Answer', value: fb });
    return arr;
  }, [questions]);

  const downloadPDF = async () => {
    // simple fallback: print. If you want a real PDF, wire html2canvas + jsPDF server-side or in-browser.
    try {
      window.print();
    } catch (e) {
      console.error(e);
      alert('Unable to print report in this environment.');
    }
  };

  return (
    <motion.div className="max-w-7xl mx-auto p-6 bg-white rounded-3xl shadow-2xl border border-gray-100" id="report-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      {/* Loading indicator for auto-check */}
      {isChecking && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Auto-checking answers...</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 pb-6 border-b border-gray-200">
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl">
              <AcademicCapIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Performance Assessment Report</h1>
              <p className="text-sm text-gray-600 mt-1">Detailed breakdown of attempts and strengths</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Candidate: <strong className="text-gray-900">{candidateName}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString()}</span>
            </div>
            {typeof timeSpent === 'number' && (
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Time: {timeSpent}m</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-center lg:text-right mt-4 lg:mt-0">
          <div className={`text-4xl font-black ${overall >= 80 ? 'text-green-600' : overall >= 60 ? 'text-yellow-500' : 'text-red-600'}`}>
            {overall}%
          </div>
          <div className="flex items-center justify-center lg:justify-end space-x-2 mt-2">
            <PerformanceBadge score={overall} />
          </div>
          <p className="text-sm text-gray-500 mt-1">Overall Score</p>
        </div>
      </div>

      {/* Rest of your existing UI remains exactly the same */}
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-2xl border border-blue-200 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <TrophyIcon className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">{correctAnswers}</span>
          </div>
          <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wide">Correct Answers</h3>
          <p className="text-xs text-blue-600 mt-1">out of {questions.length} questions</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-2xl border border-green-200 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">{completionRate}%</span>
          </div>
          <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide">Completion Rate</h3>
          <p className="text-xs text-green-600 mt-1">{Object.keys(scores).length} answered</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-6 rounded-2xl border border-purple-200 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <ChartBarIcon className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">{metrics.length ? Math.round(metrics.reduce((s,m)=> s + m.percentage, 0) / metrics.length) : 0}%</span>
          </div>
          <h3 className="text-sm font-semibold text-purple-800 uppercase tracking-wide">Avg Topic Score</h3>
          <p className="text-xs text-purple-600 mt-1">across all topics</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-6 rounded-2xl border border-amber-200 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <LightBulbIcon className="h-8 w-8 text-amber-600" />
            <span className="text-2xl font-bold text-gray-900">{strengths.length}</span>
          </div>
          <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">Strong Areas</h3>
          <p className="text-xs text-amber-600 mt-1">topics mastered</p>
        </div>
      </div>

      {/* Skill Radar */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center"><LightBulbIcon className="h-6 w-6 text-indigo-600 mr-2" /> Skill Radar</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <RadarChart data={topicPerformance.map(tp => ({ topic: tp.topic.length > 18 ? tp.topic.substring(0,18)+'...' : tp.topic, score: tp.percentage }))}>
              <PolarGrid />
              <PolarAngleAxis dataKey="topic" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Candidate" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Type Accuracy & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center"><AcademicCapIcon className="h-6 w-6 text-indigo-600 mr-2" /> Question Type Accuracy</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[{ label: 'MCQ', value: typeStats.mcq }, { label: 'One-liner', value: typeStats.oneLiner }, { label: 'Short Answer', value: typeStats.fillBlank }].map((card, idx) => (
              <div key={idx} className="p-4 rounded-xl shadow-sm bg-gradient-to-r from-gray-50 to-gray-100 text-center">
                <div className="text-2xl font-bold">{card.value}%</div>
                <div className="text-sm font-medium tracking-wide mt-1">{card.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center"><ChartBarIcon className="h-6 w-6 text-indigo-600 mr-2" /> Question Distribution</h3>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={questionTypeDistribution} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
                  {questionTypeDistribution.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value:any, name:any) => [`${value}`, `${name}`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Topic Performance Bar Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center"><TrophyIcon className="h-6 w-6 text-indigo-600 mr-2" /> Topic Performance</h3>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={topicPerformance.map(tp => ({ topic: tp.topic.length > 20 ? tp.topic.substring(0,20)+'...' : tp.topic, score: tp.percentage }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="topic" angle={-30} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value:any) => [`${value}%`, 'Accuracy']} />
              <Bar dataKey="score" radius={[6,6,0,0]}>
                {topicPerformance.map((entry, index) => (
                  <Cell key={`cell-t-${index}`} fill={entry.percentage >= 80 ? '#10b981' : entry.percentage >= 60 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200 shadow-lg">
          <div className="flex items-center mb-4"><TrophyIcon className="h-8 w-8 text-green-600 mr-3" /><h3 className="text-2xl font-bold text-green-800">Strengths</h3></div>
          {strengths.length ? (
            <div className="space-y-3">
              {strengths.map(s => (
                <div key={s} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-green-100">
                  <div className="flex items-center"><CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" /> <span className="text-gray-800 font-medium">{s}</span></div>
                  <span className="text-green-600 font-bold">{metrics.find(m=>m.topic===s)?.percentage ?? 0}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6"><LightBulbIcon className="h-12 w-12 text-green-400 mx-auto mb-3" /><p className="text-green-700 font-medium">No standout strengths yet.</p></div>
          )}
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-2xl border border-red-200 shadow-lg">
          <div className="flex items-center mb-4"><ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" /><h3 className="text-2xl font-bold text-red-800">Areas for Improvement</h3></div>
          {weaknesses.length ? (
            <div className="space-y-3">
              {weaknesses.map(w => (
                <div key={w} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-red-100">
                  <div className="flex items-center"><XCircleIcon className="h-5 w-5 text-red-500 mr-3" /> <span className="text-gray-800 font-medium">{w}</span></div>
                  <span className="text-red-600 font-bold">{metrics.find(m=>m.topic===w)?.percentage ?? 0}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6"><TrophyIcon className="h-12 w-12 text-red-400 mx-auto mb-3" /><p className="text-red-700 font-medium">No significant weaknesses detected.</p></div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center">
            <DocumentTextIcon className="h-6 w-6 text-indigo-600 mr-2" />
            Detailed Question Analysis
          </h3>
          <div className="text-sm text-gray-500">{metrics.reduce((sum, m) => sum + m.evidence.length, 0)} responses analyzed</div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Topic</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Question</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Your Answer</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">Feedback</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {metrics.map((metric) =>
                metric.evidence.map((evidenceItem: any, idx: number) => (
                  <motion.tr
                    key={`${metric.topic}-${idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-blue-50"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center">
                        <div
                          className={`w-3 h-3 rounded-full mr-3 ${
                            metric.percentage >= 80 ? 'bg-green-500' : metric.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                        />
                        {metric.topic}
                      </div>
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      <div className="line-clamp-2 font-medium text-gray-800" title={evidenceItem.q}>
                        {evidenceItem.q}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="line-clamp-2 text-gray-700" title={evidenceItem.given}>
                        {evidenceItem.given}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="line-clamp-2 text-gray-600" title={evidenceItem.feedback}>
                        {evidenceItem.feedback}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {evidenceItem.correct ? (
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Correct
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium">
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          Incorrect
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">Report generated by Sales Knowledge Analyzer</div>
        <div className="flex gap-3">
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl">New Assessment</button>
          <button onClick={downloadPDF} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl flex items-center"><ArrowDownTrayIcon className="h-5 w-5 mr-2" /> Download Full Report</button>
        </div>
      </div>
    </motion.div>
  );
}