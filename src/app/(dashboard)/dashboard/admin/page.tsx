'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/dashboard/metric-card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Building, CreditCard, Activity, DollarSign } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Admin Panel</h1>
        <p className="text-sm text-[#8892b0] mt-1">Platform management and configuration</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard icon={Building} label="Total Companies" value="142" />
        <MetricCard icon={CreditCard} label="Active Subscriptions" value="87" />
        <MetricCard icon={Activity} label="Avg AI Debt Score" value="65" />
        <MetricCard icon={DollarSign} label="Monthly Revenue" value="$8,420" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader>
            <CardTitle className="text-white text-base">Feature Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {['Advanced Prompt Analysis', 'Repo Auto-Scan', 'AI Merge Blocking', 'Executive PDF Export', 'Slack Bot v2'].map((flag) => (
              <div key={flag} className="flex items-center justify-between">
                <Label className="text-[#8892b0]">{flag}</Label>
                <Switch />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader>
            <CardTitle className="text-white text-base">Governance Model Tuning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#8892b0]">Scoring Model Version</Label>
              <Select defaultValue="v2.1">
                <SelectTrigger className="bg-[#0a0e1a] border-[#1e2a4a] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="v2.1">v2.1 (Current)</SelectItem>
                  <SelectItem value="v2.0">v2.0</SelectItem>
                  <SelectItem value="v1.0">v1.0 (Legacy)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#8892b0]">AI Detection Sensitivity</Label>
              <Select defaultValue="medium">
                <SelectTrigger className="bg-[#0a0e1a] border-[#1e2a4a] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Apply Changes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
