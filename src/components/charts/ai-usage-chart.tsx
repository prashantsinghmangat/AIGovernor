'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AIUsageChartProps {
  data: Array<{ week: string; ai_loc: number; human_loc: number }>;
}

export function AIUsageChart({ data }: AIUsageChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2a4a" />
        <XAxis dataKey="week" stroke="#5a6480" tick={{ fontSize: 12 }} />
        <YAxis stroke="#5a6480" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#131b2e',
            border: '1px solid #1e2a4a',
            borderRadius: '8px',
            color: '#e8eaf0',
          }}
        />
        <Area
          type="monotone"
          dataKey="human_loc"
          stackId="1"
          stroke="#3b82f6"
          fill="rgba(59,130,246,0.2)"
          name="Human LOC"
        />
        <Area
          type="monotone"
          dataKey="ai_loc"
          stackId="1"
          stroke="#f59e0b"
          fill="rgba(245,158,11,0.2)"
          name="AI LOC"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
