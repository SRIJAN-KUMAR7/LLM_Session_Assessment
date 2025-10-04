import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

type Props = { data: { topic: string; score: number }[] };
export function SkillRadar({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="topic" className="text-xs" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} className="text-xs" />
        <Radar name="Candidate" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
      </RadarChart>
    </ResponsiveContainer>
  );
}