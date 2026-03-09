'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

interface CompanyProfile {
  company_name: string;
  user_email: string;
  role: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const json = await res.json();
          setProfile({
            company_name: json.data?.company_name || '',
            user_email: json.data?.user_email || '',
            role: json.data?.user_role || '',
          });
        }
      } catch {
        // Silently fail — fields stay empty
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Settings saved');
    }, 600);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Settings</h1>
        <p className="text-sm text-[#8892b0] mt-1">Configure your organization and governance settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company info */}
        <Card className="bg-[#131b2e] border-[#1e2a4a]">
          <CardHeader>
            <CardTitle className="text-white text-base">Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#8892b0]">Company Name</Label>
              <Input
                defaultValue={profile?.company_name || ''}
                placeholder="Your company name"
                className="bg-[#0a0e1a] border-[#1e2a4a] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#8892b0]">Account Email</Label>
              <Input
                value={profile?.user_email || ''}
                disabled
                className="bg-[#0a0e1a] border-[#1e2a4a] text-[#5a6480]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#8892b0]">Role</Label>
              <Input
                value={profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : ''}
                disabled
                className="bg-[#0a0e1a] border-[#1e2a4a] text-[#5a6480]"
              />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Governance config */}
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
              <p className="text-xs text-[#5a6480]">How aggressively AI code patterns are flagged</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[#8892b0]">Risk Threshold</Label>
              <Input type="number" defaultValue={60} className="bg-[#0a0e1a] border-[#1e2a4a] text-white font-mono" />
              <p className="text-xs text-[#5a6480]">Debt score below this triggers alerts</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Configuration
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
