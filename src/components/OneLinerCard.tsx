import React, { useState } from 'react';
import type { OneLinerData, ScorePayload } from '../types';

type Props = {
  data: OneLinerData;
  onAnswer: (p: ScorePayload) => void;
};

export const OneLinerCard: React.FC<Props> = ({ data, onAnswer }) => {
  const [value, setValue] = useState('');

  const normalize = (s: string) => (data.caseSensitive ? s : s.toLowerCase());

  // Levenshtein distance (classic implementation)
  const levenshtein = (a: string, b: string): number => {
    const al = a.length;
    const bl = b.length;
    if (al === 0) return bl;
    if (bl === 0) return al;
    const dp: number[][] = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
    for (let i = 0; i <= al; i++) dp[i][0] = i;
    for (let j = 0; j <= bl; j++) dp[0][j] = j;
    for (let i = 1; i <= al; i++) {
      for (let j = 1; j <= bl; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[al][bl];
  };

  // similarity in [0..1] using levenshtein normalized by max length
  const similarity = (a: string, b: string): number => {
    if (!a && !b) return 1;
    if (!a || !b) return 0;
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return Math.max(0, 1 - dist / maxLen);
  };

  // helper: check if 'short' is an acronym of 'long' (e.g., ECM <- Engineering Computational Mechanics)
  const isAcronymOf = (shortRaw: string, longRaw: string): boolean => {
    const short = shortRaw.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const longWords = longRaw.split(/\s+/).filter(Boolean);
    if (!short || longWords.length < 2) return false;
    const letters = longWords.map(w => w[0]).join('').toLowerCase();
    return letters === short;
  };

  /**
   * Build groups of synonyms:
   * - If keywords already an array of arrays -> use as groups
   * - Else try to auto-group synonyms:
   *    * if one keyword contains another (substring) -> group them
   *    * if one is acronym of another -> group them
   *    * otherwise each keyword becomes its own group (legacy)
   */
  const buildGroups = (): string[][] => {
    if (!Array.isArray(data.keywords) || data.keywords.length === 0) return [];

    // detect grouped form (first element is an array)
    if (Array.isArray((data.keywords as any)[0])) {
      return (data.keywords as unknown as string[][]).map(group =>
        group.map(k => normalize(k))
      );
    }

    // flat keywords -> attempt to auto-group synonyms (acronym/substring heuristic)
    const rawKeys = data.keywords as string[];
    const n = rawKeys.length;
    const visited = new Array(n).fill(false);
    const groups: string[][] = [];

    for (let i = 0; i < n; i++) {
      if (visited[i]) continue;
      const group = [normalize(rawKeys[i])];
      visited[i] = true;

      for (let j = i + 1; j < n; j++) {
        if (visited[j]) continue;
        const a = rawKeys[i];
        const b = rawKeys[j];
        const aNorm = normalize(a);
        const bNorm = normalize(b);

        const substringMatch = aNorm.includes(bNorm) || bNorm.includes(aNorm);
        const acronymMatch = isAcronymOf(a, b) || isAcronymOf(b, a);

        if (substringMatch || acronymMatch) {
          group.push(normalize(rawKeys[j]));
          visited[j] = true;
        }
      }
      groups.push(group);
    }

    return groups;
  };

  /**
   * Compute:
   * - groupMatchFraction: fraction of groups with at least one exact/synonym substring match
   * - bestKeywordSimilarity: best lexical similarity (Levenshtein-based) between answer and any keyword
   * Combine into final score:
   *   combined = wGroup * groupMatchFraction + wLex * bestKeywordSimilarity
   *
   * Weights chosen so that keyword presence matters most but lexical closeness helps partial credit.
   */
  const scoreAnswer = (raw: string): { combined: number; groupMatchFraction: number; bestSim: number } => {
    const src = normalize(raw);
    const groups = buildGroups();
    if (groups.length === 0) return { combined: 0, groupMatchFraction: 0, bestSim: 0 };

    // group matching via substring check (synonym arrays already normalized)
    let matched = 0;
    for (const syns of groups) {
      const hit = syns.some(s => src.includes(s));
      if (hit) matched += 1;
    }
    const groupMatchFraction = matched / groups.length;

    // compute best similarity vs any keyword
    let bestSim = 0;
    for (const syns of groups) {
      for (const s of syns) {
        const sim = similarity(src, s);
        if (sim > bestSim) bestSim = sim;
      }
    }

    // weights (tweakable): group presence is more important
    const wGroup = 0.75;
    const wLex = 0.25;
    const combined = Math.max(0, Math.min(1, wGroup * groupMatchFraction + wLex * bestSim));
    return { combined, groupMatchFraction, bestSim };
  };

  const handleSubmit = () => {
    const trimmed = value.trim();
    const groups = buildGroups();
    const { combined, groupMatchFraction, bestSim } = scoreAnswer(trimmed);

    // prepare feedback
    let feedback = '';
    if (groups.length === 0) {
      feedback = 'No keywords configured for this question.';
    } else if (combined === 1) {
      feedback = `Great! Closeness: 100%`;
    } else {
      // find missing groups (no substring hit)
      const missing = groups
        .filter(syns => !syns.some(s => normalize(trimmed).includes(s)))
        .map(syns => syns.slice(0, 3).join('/') /* representative */);

      const percent = Math.round(combined * 100);
      feedback = `Closeness: ${percent}%. Missing required term(s): ${missing.join(', ')}. (group match ${(groupMatchFraction * 100).toFixed(0)}%, best lexical similarity ${(bestSim * 100).toFixed(0)}%)`;
    }

    onAnswer({
      questionId: data.id,
      answer: value,
      correct: combined >= 0.8,
      score: Number(combined.toFixed(3)), // keep 3 decimals
      feedback,
      llmConfirmed: undefined
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
