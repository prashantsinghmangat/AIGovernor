'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Settings</h1>
        <p className="text-sm text-[#8892b0] mt-1">Configure your organization and governance settings</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader>
            <CardTitle className="text-white text-base">Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#8892b0]">Company Name</Label>
              <Input defaultValue="Acme Corporation" className="bg-[#0a0e1a] border-[#1e2a4a] text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#8892b0]">Industry</Label>
              <Input placeholder="e.g., SaaS, Fintech" className="bg-[#0a0e1a] border-[#1e2a4a] text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#8892b0]">Team Size</Label>
              <Select defaultValue="11-50">
                <SelectTrigger className="bg-[#0a0e1a] border-[#1e2a4a] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10</SelectItem>
                  <SelectItem value="11-50">11-50</SelectItem>
                  <SelectItem value="51-200">51-200</SelectItem>
                  <SelectItem value="200+">200+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
          </CardContent>
        </Card>
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader>
            <CardTitle className="text-white text-base">Governance Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#8892b0]">Scoring Sensitivity</Label>
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
            <div className="space-y-2">
              <Label className="text-[#8892b0]">Risk Threshold</Label>
              <Input type="number" defaultValue={60} className="bg-[#0a0e1a] border-[#1e2a4a] text-white font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#8892b0]">Notification Frequency</Label>
              <Select defaultValue="daily">
                <SelectTrigger className="bg-[#0a0e1a] border-[#1e2a4a] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Update Configuration</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
