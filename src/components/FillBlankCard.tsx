// FillBlankCard.tsx (replace current file)
import React, { useState, useMemo } from 'react';
import type { FillBlankData, ScorePayload } from '../types';

type Props = {
  data: FillBlankData;
  onAnswer: (p: ScorePayload) => void;
};

export const FillBlankCard: React.FC<Props> = ({ data, onAnswer }) => {
  // split sentence into parts around '___'
  const parts = data.sentence.split('___');
  const blanksCount = Math.max(0, parts.length - 1);

  // values for each blank
  const [values, setValues] = useState<string[]>(
    Array.from({ length: blanksCount }, () => '')
  );
  const [combinedTried, setCombinedTried] = useState(false);

  // Normalize: lowercase (unless caseSensitive), remove punctuation (but keep spaces),
  // collapse multiple spaces and trim.
  const normalize = (s: string) => {
    let t = data.caseSensitive ? s : s.toLowerCase();
    // remove punctuation except spaces and alphanumerics
    t = t.replace(/[^\p{L}\p{N}\s]/gu, ''); // unicode-safe
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  };

  // Build per-blank acceptable groups.
  // Acceptable format supported:
  //  - grouped: acceptable = [ ['WebSockets'], ['Tailwind CSS'] ]
  //  - flat per-blank: acceptable = ['WebSockets', 'Tailwind CSS'] (length must match blanksCount)
  //  - fallback: if single string provided but blanksCount>1, try splitting on comma etc. (not recommended)
  const acceptableGroups = useMemo(() => {
    if (!Array.isArray(data.acceptable)) return Array.from({ length: blanksCount }, () => []);
    if (data.acceptable.length === 0) return Array.from({ length: blanksCount }, () => []);

    // detect grouped form (first element is an array)
    if (Array.isArray(data.acceptable[0])) {
      // cast: string[][]
      const groups = (data.acceptable as unknown as string[][]).map(group =>
        group.map((s) => normalize(s))
      );
      // if groups length differs from blanksCount, pad or trim
      if (groups.length < blanksCount) {
        while (groups.length < blanksCount) groups.push([]);
      } else if (groups.length > blanksCount) {
        groups.splice(blanksCount);
      }
      return groups;
    }

    // flat form: map each string to its own group
    const flat = (data.acceptable as string[]).map((s) => normalize(s));
    if (flat.length === blanksCount) {
      return flat.map((s) => [s]);
    }

    // if only 1 acceptable but multiple blanks, attempt splitting by comma/and
    if (flat.length === 1 && blanksCount > 1) {
      const sep = flat[0].split(/\s*,\s*|\s+and\s+|\s*;\s*/);
      const groups = sep.map((s) => [normalize(s)]);
      // pad/trim
      while (groups.length < blanksCount) groups.push([]);
      if (groups.length > blanksCount) groups.splice(blanksCount);
      return groups;
    }

    // fallback: produce blanksCount groups using best-effort (first N, rest empty)
    const groups = Array.from({ length: blanksCount }, (_, i) =>
      flat[i] ? [flat[i]] : []
    );
    return groups;
  }, [data.acceptable, data.caseSensitive, blanksCount, data.sentence]);

  // Check single blank vs multiple input behaviour:
  // If user types all answers into first input separated by comma, we'll try splitting them on submit.
  const trySplitCombined = (raw: string): string[] => {
    const parts = raw.split(/\s*,\s*|\s*;\s*|\s+and\s+|\s*\/\s*/).map(s => s.trim()).filter(Boolean);
    // if number of splits equals blanksCount, return them, else fallback to first -> others empty
    if (parts.length === blanksCount) return parts;
    // If more pieces than blanks, take first N
    if (parts.length > blanksCount) return parts.slice(0, blanksCount);
    // otherwise return what we have and leave others empty
    return [...parts, ...Array.from({ length: Math.max(0, blanksCount - parts.length) }, () => '')];
  };

  // grading function: compares normalized answer for each blank with any acceptable item in the group
  const grade = (answers: string[]): { matched: number; total: number; details: { ok: boolean; found?: string; expected: string[] }[] } => {
    let matched = 0;
    const details: { ok: boolean; found?: string; expected: string[] }[] = [];
    for (let i = 0; i < blanksCount; i++) {
      const ansRaw = answers[i] ?? '';
      const ans = normalize(ansRaw || '');
      const group = acceptableGroups[i] ?? [];

      // also accept removal of spaces in answer vs keyword (TailwindCSS vs Tailwind CSS)
      const ansNospace = ans.replace(/\s+/g, '');
      const groupMatches = group.some(k => {
        const kNospace = (k || '').replace(/\s+/g, '');
        return k === ans || kNospace === ansNospace || ans.includes(k) || k.includes(ans);
      });

      if (groupMatches) {
        matched += 1;
        details.push({ ok: true, found: ansRaw, expected: group });
      } else {
        details.push({ ok: false, expected: group });
      }
    }
    return { matched, total: blanksCount, details };
  };

  const handleChange = (idx: number, v: string) => {
    setValues(prev => {
      const copy = [...prev];
      copy[idx] = v;
      return copy;
    });
  };

  const handleSubmit = () => {
    let answers = values.map(v => v.trim());

    // If user only filled the first input and there are multiple blanks, attempt to split it
    const nonEmptyCount = answers.filter(Boolean).length;
    if (nonEmptyCount === 1 && blanksCount > 1 && !combinedTried) {
      const split = trySplitCombined(answers[0]);
      answers = split;
      setCombinedTried(true);
      setValues(split);
    }

    const { matched, total, details } = grade(answers);
    const score = total ? matched / total : 0;

    // feedback: missing groups
    const missing = details
      .map((d, i) => ({ d, i }))
      .filter(x => !x.d.ok)
      .map(x => (acceptableGroups[x.i] && acceptableGroups[x.i].length > 0 ? acceptableGroups[x.i].slice(0,3).join('/') : `blank ${x.i+1}`));

    const feedback = total === 0
      ? 'No blanks configured.'
      : (score === 1
          ? 'Correct!'
          : `Matched ${matched}/${total}. Missing: ${missing.join(', ')}`);

    onAnswer({
      questionId: data.id,
      // store a single string answer for report readability (join parts with ' | ')
      answer: answers.join(' | '),
      correct: score >= 0.8,
      score,
      feedback,
      llmConfirmed: undefined
    });
  };

  // Render sentence with inputs for each blank slot
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <p className="mb-4 text-lg font-semibold text-gray-800">
        {parts.map((p, idx) => (
          <React.Fragment key={idx}>
            <span>{p}</span>
            {idx < blanksCount && (
              <input
                value={values[idx]}
                onChange={(e) => handleChange(idx, e.target.value)}
                placeholder={`Answer`}
                className="mx-2 px-2 py-1 border-b-2 border-indigo-500 outline-none focus:border-indigo-700 transition-colors duration-200 text-gray-700"
                style={{ minWidth: '120px' }}
              />
            )}
          </React.Fragment>
        ))}
      </p>

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleSubmit}
          disabled={values.every(v => !v.trim())}
          className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          Submit Answer
        </button>

        {/* <button
          onClick={() => {
            // quick auto-fill (helpful for testing)
            const autofill = acceptableGroups.map(g => (g && g[0] ? g[0] : ''));
            setValues(autofill);
          }}
          className="px-4 py-2 bg-gray-100 rounded-md border text-sm text-gray-700 hover:bg-gray-200"
        >
          Autofill (test)
        </button> */}
      </div>
    </div>
  );
};
