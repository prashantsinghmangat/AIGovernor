'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ScoreTrendChartProps {
  data: Array<{ month: string; score: number }>;
}

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2a4a" />
        <XAxis dataKey="month" stroke="#5a6480" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} stroke="#5a6480" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#131b2e',
            border: '1px solid #1e2a4a',
            borderRadius: '8px',
            color: '#e8eaf0',
          }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: '#f59e0b', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
