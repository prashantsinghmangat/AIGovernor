'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface IntegrationItem {
  provider: string;
  icon: string;
  status: 'connected' | 'disconnected';
  connectable: boolean;
}

export default function IntegrationsPage() {
  const [githubStatus, setGithubStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const checkGitHub = async () => {
      try {
        const res = await fetch('/api/github/repos');
        setGithubStatus(res.ok ? 'connected' : 'disconnected');
      } catch {
        setGithubStatus('disconnected');
      }
    };
    checkGitHub();
  }, []);

  const handleConnectGitHub = async () => {
    setConnecting(true);
    try {
      const res = await fetch('/api/auth/github/connect');
      const json = await res.json();
      window.location.href = json.url;
    } catch {
      toast.error('Failed to start GitHub connection');
      setConnecting(false);
    }
  };

  const integrations: IntegrationItem[] = [
    { provider: 'GitHub', icon: '🐙', status: githubStatus === 'connected' ? 'connected' : 'disconnected', connectable: true },
    { provider: 'Slack', icon: '💬', status: 'disconnected', connectable: false },
    { provider: 'Jira', icon: '📋', status: 'disconnected', connectable: false },
    { provider: 'Claude (Anthropic)', icon: '🤖', status: 'disconnected', connectable: false },
    { provider: 'OpenAI', icon: '🧠', status: 'disconnected', connectable: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Integrations</h1>
        <p className="text-sm text-[#8892b0] mt-1">Manage connected services and notification preferences</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((i) => (
          <Card key={i.provider} className="bg-[#131b2e] border-[#1e2a4a]">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{i.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white">{i.provider}</p>
                  {githubStatus === 'checking' && i.provider === 'GitHub' ? (
                    <Badge variant="outline" className="text-xs border-0 mt-1 bg-gray-500/20 text-gray-400">
                      checking...
                    </Badge>
                  ) : (
                    <Badge variant="outline" className={`text-xs border-0 mt-1 ${
                      i.status === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {i.status}
                    </Badge>
                  )}
                </div>
              </div>
              {i.provider === 'GitHub' ? (
                i.status === 'connected' ? (
                  <Button variant="outline" size="sm" className="border-[#1e2a4a] text-[#8892b0]" onClick={() => toast.info('GitHub is connected. Manage repos from the Repositories page.')}>
                    Manage
                  </Button>
                ) : (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConnectGitHub} disabled={connecting || githubStatus === 'checking'}>
                    {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {connecting ? 'Connecting...' : 'Connect'}
                  </Button>
                )
              ) : (
                <Button variant="outline" size="sm" className="border-[#1e2a4a] text-[#8892b0]" disabled>
                  Coming Soon
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-[#131b2e] border-[#1e2a4a]">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-medium text-white">Notification Preferences</h3>
          <div className="flex items-center justify-between">
            <Label className="text-[#8892b0]">Weekly Slack Report</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[#8892b0]">Real-time Risk Alerts</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-[#8892b0]">AI Merge Warnings</Label>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
