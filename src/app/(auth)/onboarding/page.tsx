'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { GitBranch, Database, Brain, RefreshCw, Check, Loader2, Lock } from 'lucide-react';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { toast } from 'sonner';

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const {
    step, setStep,
    githubRepos, setGithubRepos,
    selectedRepoIds, toggleRepo,
    aiProvider, setAiProvider,
    scanProgress, setScanProgress,
  } = useOnboardingStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connecting, setConnecting] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const savedRef = useRef(false);

  // Handle GitHub OAuth callback redirect (?step=2)
  useEffect(() => {
    const stepParam = searchParams.get('step');
    const error = searchParams.get('error');
    console.log('[Onboarding] URL params — step:', stepParam, '| error:', error);
    if (error) {
      console.error('[Onboarding] GitHub OAuth error param:', error);
      toast.error('GitHub connection failed. Please try again.');
    }
    if (stepParam === '2') {
      console.log('[Onboarding] GitHub connected → moving to step 2');
      setStep(2);
    }
  }, [searchParams, setStep]);

  // Fetch GitHub repos when entering step 2
  const fetchRepos = useCallback(async () => {
    setLoadingRepos(true);
    console.log('[Onboarding] Fetching GitHub repos from /api/github/repos...');
    try {
      const res = await fetch('/api/github/repos');
      console.log('[Onboarding] /api/github/repos response status:', res.status);
      if (res.ok) {
        const json = await res.json();
        console.log('[Onboarding] Repos fetched:', json.data.repos.length, 'repos');
        setGithubRepos(json.data.repos);
      } else {
        const json = await res.json();
        console.error('[Onboarding] Failed to fetch repos:', json);
        if (json.code === 'GITHUB_NOT_CONNECTED') {
          toast.error('GitHub not connected yet. Please connect your account first.');
          setStep(1);
        } else {
          toast.error('Failed to fetch repositories');
        }
      }
    } catch {
      toast.error('Failed to fetch repositories');
    } finally {
      setLoadingRepos(false);
    }
  }, [setGithubRepos, setStep]);

  useEffect(() => {
    if (step === 2 && githubRepos.length === 0) {
      fetchRepos();
    }
  }, [step, githubRepos.length, fetchRepos]);

  // Save repos + trigger scan when step 4 starts
  useEffect(() => {
    if (step !== 4 || savedRef.current) return;
    savedRef.current = true;

    const saveAndScan = async () => {
      const selectedRepos = githubRepos.filter((r) => selectedRepoIds.includes(r.github_id));
      try {
        const saveRes = await fetch('/api/repositories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ github_repos: selectedRepos }),
        });
        if (!saveRes.ok) {
          toast.error('Failed to save repositories');
          return;
        }

        await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scan_type: 'full' }),
        });
      } catch {
        toast.error('Something went wrong saving repositories');
      }
    };

    saveAndScan();
  }, [step, githubRepos, selectedRepoIds]);

  // Progress animation for step 4
  useEffect(() => {
    if (step !== 4) return;
    const interval = setInterval(() => {
      setScanProgress(Math.min(scanProgress + 5, 100));
    }, 250);
    if (scanProgress >= 100) {
      clearInterval(interval);
      setTimeout(() => router.push('/dashboard'), 1000);
    }
    return () => clearInterval(interval);
  }, [step, scanProgress, setScanProgress, router]);

  const handleConnectGitHub = async () => {
    setConnecting(true);
    console.log('[Onboarding] Requesting GitHub OAuth URL...');
    try {
      const res = await fetch('/api/auth/github/connect');
      console.log('[Onboarding] /api/auth/github/connect status:', res.status);
      const json = await res.json();
      console.log('[Onboarding] GitHub OAuth URL:', json.url || json.error);
      if (!json.url) {
        console.error('[Onboarding] No URL returned from connect API:', json);
        toast.error('GitHub OAuth not configured — check GITHUB_CLIENT_ID in .env.local');
        setConnecting(false);
        return;
      }
      console.log('[Onboarding] Redirecting browser to GitHub OAuth...');
      window.location.href = json.url;
    } catch (err) {
      console.error('[Onboarding] handleConnectGitHub error:', err);
      toast.error('Failed to start GitHub connection');
      setConnecting(false);
    }
  };

  const steps = [
    { icon: GitBranch, label: 'Connect GitHub' },
    { icon: Database, label: 'Select Repos' },
    { icon: Brain, label: 'AI Provider' },
    { icon: RefreshCw, label: 'Scanning' },
  ];

  return (
    <div className="w-full max-w-lg">
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-mono ${
              i + 1 <= step ? 'bg-blue-600 text-white' : 'bg-[#1e2a4a] text-[#5a6480]'
            }`}>
              {i + 1 < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className={`h-0.5 w-8 ${i + 1 < step ? 'bg-blue-600' : 'bg-[#1e2a4a]'}`} />}
          </div>
        ))}
      </div>

      <Card className="bg-[#131b2e] border-[#1e2a4a]">
        <CardContent className="p-8">
          {/* Step 1: Connect GitHub */}
          {step === 1 && (
            <div className="text-center space-y-6">
              <GitBranch className="h-12 w-12 text-blue-400 mx-auto" />
              <h2 className="text-xl font-display font-bold text-white">Connect GitHub</h2>
              <p className="text-sm text-[#8892b0]">We&apos;ll analyze your repositories for AI-generated code patterns.</p>
              <Button onClick={handleConnectGitHub} disabled={connecting} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <GitBranch className="h-4 w-4 mr-2" />}
                {connecting ? 'Connecting...' : 'Connect GitHub Account'}
              </Button>
              <p className="text-xs text-[#5a6480]">
                <Lock className="h-3 w-3 inline mr-1" />
                We request read access to analyze your repositories.
              </p>
            </div>
          )}

          {/* Step 2: Select Repos */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <Database className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <h2 className="text-xl font-display font-bold text-white">Select Repositories</h2>
                <p className="text-sm text-[#8892b0] mt-1">Choose which repos to monitor for AI governance</p>
              </div>
              {loadingRepos ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                  <p className="text-sm text-[#8892b0]">Fetching your repositories...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {githubRepos.map((repo) => (
                      <div key={repo.github_id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#182040] transition-colors">
                        <Checkbox
                          checked={selectedRepoIds.includes(repo.github_id)}
                          onCheckedChange={() => toggleRepo(repo.github_id)}
                        />
                        <GitBranch className="h-4 w-4 text-[#5a6480] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="font-mono text-sm text-white block truncate">{repo.full_name}</span>
                          <span className="text-xs text-[#5a6480]">{repo.language || 'Unknown'}{repo.is_private ? ' · Private' : ''}</span>
                        </div>
                      </div>
                    ))}
                    {githubRepos.length === 0 && (
                      <p className="text-center text-sm text-[#5a6480] py-4">No repositories found.</p>
                    )}
                  </div>
                  <Button onClick={() => setStep(3)} disabled={selectedRepoIds.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Continue ({selectedRepoIds.length} selected)
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Step 3: AI Provider */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <Brain className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <h2 className="text-xl font-display font-bold text-white">AI Provider</h2>
                <p className="text-sm text-[#8892b0] mt-1">Which AI tools does your team use?</p>
              </div>
              <RadioGroup value={aiProvider} onValueChange={setAiProvider} className="space-y-3">
                {['Claude (Anthropic)', 'OpenAI / ChatGPT', 'GitHub Copilot'].map((provider) => (
                  <div key={provider} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#182040] transition-colors">
                    <RadioGroupItem value={provider} id={provider} />
                    <Label htmlFor={provider} className="text-sm text-white cursor-pointer">{provider}</Label>
                  </div>
                ))}
              </RadioGroup>
              <Button onClick={() => { setScanProgress(0); savedRef.current = false; setStep(4); }} disabled={!aiProvider} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Start Governance Scan
              </Button>
            </div>
          )}

          {/* Step 4: Scanning */}
          {step === 4 && (
            <div className="text-center space-y-6">
              <RefreshCw className={`h-12 w-12 text-blue-400 mx-auto ${scanProgress < 100 ? 'animate-spin' : ''}`} />
              <h2 className="text-xl font-display font-bold text-white">
                {scanProgress < 100 ? 'Scanning Repositories...' : 'Scan Complete!'}
              </h2>
              <p className="text-sm text-[#8892b0]">
                {scanProgress < 100 ? `Analyzing ${selectedRepoIds.length} repositories for AI patterns...` : 'Redirecting to your dashboard...'}
              </p>
              <Progress value={scanProgress} className="h-2" />
              <p className="font-mono text-2xl font-bold text-blue-400">{scanProgress}%</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
