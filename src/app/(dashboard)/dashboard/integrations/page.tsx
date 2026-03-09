'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Integrations</h1>
        <p className="text-sm text-[#8892b0] mt-1">Manage connected services</p>
      </div>

      {/* GitHub integration */}
      <Card className="bg-[#131b2e] border-[#1e2a4a]">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐙</span>
            <div>
              <p className="text-sm font-medium text-white">GitHub</p>
              <p className="text-xs text-[#5a6480] mt-0.5">Repository scanning, PR analysis, webhooks</p>
              {githubStatus === 'checking' ? (
                <Badge variant="outline" className="text-xs border-0 mt-1 bg-gray-500/20 text-gray-400">
                  checking...
                </Badge>
              ) : (
                <Badge variant="outline" className={`text-xs border-0 mt-1 ${
                  githubStatus === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {githubStatus}
                </Badge>
              )}
            </div>
          </div>
          {githubStatus === 'connected' ? (
            <Button variant="outline" size="sm" className="border-[#1e2a4a] text-[#8892b0]" onClick={() => toast.info('GitHub is connected. Manage repos from the Repositories page.')}>
              Manage
            </Button>
          ) : (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConnectGitHub} disabled={connecting || githubStatus === 'checking'}>
              {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {connecting ? 'Connecting...' : 'Connect'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Slack integration */}
      <Card className="bg-[#131b2e] border-[#1e2a4a]">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <p className="text-sm font-medium text-white">Slack</p>
              <p className="text-xs text-[#5a6480] mt-0.5">Receive scan alerts and vulnerability notifications</p>
              <Badge variant="outline" className="text-xs border-0 mt-1 bg-gray-500/20 text-gray-400">
                not configured
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-[#1e2a4a] text-[#8892b0]" onClick={() => toast.info('Configure Slack notifications in Settings → Notifications.')}>
            Setup
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-[#5a6480]">
        Configure notification channels (Slack, email, webhooks) from the Settings page.
      </p>
    </div>
  );
}
