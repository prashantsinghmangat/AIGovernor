import { ROICalculator } from '@/components/dashboard/roi-calculator';

export default function ROIPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">ROI Calculator</h1>
        <p className="text-sm text-[#8892b0] mt-1">Calculate the return on investment for AI governance</p>
      </div>
      <ROICalculator />
    </div>
  );
}
