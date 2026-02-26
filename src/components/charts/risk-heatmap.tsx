'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface RiskHeatmapProps {
  data: Array<{ repo: string; risk_score: number; risk_level: string }>;
}

export function RiskHeatmap({ data }: RiskHeatmapProps) {
  const getColor = (level: string) => {
    switch (level) {
      case 'critical': return '#ef4444';
      case 'caution': return '#f59e0b';
      case 'healthy': return '#22c55e';
      default: return '#3b82f6';
    }
  };

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical" margin={{ left: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2a4a" />
        <XAxis type="number" domain={[0, 100]} stroke="#5a6480" tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="repo" stroke="#5a6480" tick={{ fontSize: 11 }} width={80} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#131b2e',
            border: '1px solid #1e2a4a',
            borderRadius: '8px',
            color: '#e8eaf0',
          }}
        />
        <Bar dataKey="risk_score" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={getColor(entry.risk_level)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
