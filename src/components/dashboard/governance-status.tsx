interface GovernanceStatusProps {
  score: number;
}

export function GovernanceStatus({ score }: GovernanceStatusProps) {
  const status = score >= 80 ? 'Stable' : score >= 60 ? 'At Risk' : 'Critical';
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#131b2e] border border-[#1e2a4a] rounded-full">
      <div className={`h-2 w-2 rounded-full ${color} animate-pulse`} />
      <span className="text-xs text-[#8892b0]">
        Governance: <span className={`font-medium ${textColor}`}>{status}</span>
      </span>
    </div>
  );
}
