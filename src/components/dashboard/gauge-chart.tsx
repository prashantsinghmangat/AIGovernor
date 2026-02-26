'use client';

interface GaugeChartProps {
  value: number;
  size?: number;
  label?: string;
}

export function GaugeChart({ value, size = 180, label = 'AI Debt Score' }: GaugeChartProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const color = clampedValue >= 80 ? '#22c55e' : clampedValue >= 60 ? '#f59e0b' : '#ef4444';
  const bgColor = clampedValue >= 80 ? 'rgba(34,197,94,0.1)' : clampedValue >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';

  const radius = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;
  const valueAngle = startAngle + (clampedValue / 100) * totalAngle;

  const polarToCartesian = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  const describeArc = (start: number, end: number) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArcFlag = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${e.x} ${e.y}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="#1e2a4a"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d={describeArc(startAngle, valueAngle)}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${color}40)`,
            transition: 'all 1s ease-out',
          }}
        />
        <circle cx={cx} cy={cy} r={radius - 20} fill={bgColor} />
        <text
          x={cx}
          y={cy - 5}
          textAnchor="middle"
          className="font-mono"
          fill={color}
          fontSize={size * 0.22}
          fontWeight="bold"
        >
          {clampedValue}
        </text>
        <text
          x={cx}
          y={cy + size * 0.1}
          textAnchor="middle"
          fill="#8892b0"
          fontSize={size * 0.07}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
