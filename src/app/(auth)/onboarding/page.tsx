'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { GitBranch, Database, Brain, RefreshCw, Check, Loader2, Lock, Upload, FileArchive } from 'lucide-react';
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
    onboardingMode, setOnboardingMode,
    githubRepos, setGithubRepos,
    selectedRepoIds, toggleRepo,
    aiProvider, setAiProvider,
    scanProgress, setScanProgress,
    uploadedRepoId, setUploadedRepoId,
  } = useOnboardingStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connecting, setConnecting] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);
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
    if (step === 2 && onboardingMode === 'github' && githubRepos.length === 0) {
      fetchRepos();
    }
  }, [step, onboardingMode, githubRepos.length, fetchRepos]);

  // Save repos + trigger scan when step 4 starts (GitHub mode only — upload mode already triggered scan)
  useEffect(() => {
    if (step !== 4 || savedRef.current) return;
    savedRef.current = true;

    // Upload mode: scan was already triggered during upload — nothing to do here
    if (onboardingMode === 'upload') return;

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
  }, [step, onboardingMode, githubRepos, selectedRepoIds]);

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

  const handleUploadZip = async () => {
    if (!uploadFile || !uploadName.trim()) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('name', uploadName.trim());

      const res = await fetch('/api/repositories/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: 'Upload failed' }));
        toast.error(json.error || 'Upload failed');
        return;
      }

      const data = await res.json();
      setUploadedRepoId(data.repository_id || data.data?.repository_id);
      toast.success(`Uploaded ${data.file_count || data.data?.file_count || 0} files — scanning started`);
      setScanProgress(0);
      savedRef.current = false;
      setStep(4);
    } catch {
      toast.error('Upload failed — please try again');
    } finally {
      setUploading(false);
    }
  };

  const steps = onboardingMode === 'upload'
    ? [
        { icon: Upload, label: 'Upload ZIP' },
        { icon: FileArchive, label: 'Project Info' },
        { icon: Brain, label: 'AI Provider' },
        { icon: RefreshCw, label: 'Scanning' },
      ]
    : [
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
          {/* Step 1: Connect GitHub or Upload ZIP */}
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

              <div className="border-t border-[#1e2a4a] pt-4 mt-4">
                <p className="text-xs text-[#5a6480] mb-2">Don&apos;t use GitHub?</p>
                <Button
                  variant="link"
                  onClick={() => { setOnboardingMode('upload'); setStep(2); }}
                  className="text-blue-400 text-sm"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Upload a ZIP file instead
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Select Repos (GitHub) or Upload ZIP */}
          {step === 2 && onboardingMode === 'github' && (
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

          {/* Step 2: Upload ZIP mode */}
          {step === 2 && onboardingMode === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <FileArchive className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <h2 className="text-xl font-display font-bold text-white">Upload Your Project</h2>
                <p className="text-sm text-[#8892b0] mt-1">Upload a ZIP of your project to scan</p>
              </div>

              {/* File picker */}
              <div
                onClick={() => document.getElementById('onboarding-zip-input')?.click()}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-6 transition-colors ${
                  uploadFile
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-[#1e2a4a] hover:border-[#5a6480] hover:bg-[#1e2a4a]/30'
                }`}
              >
                <input
                  id="onboarding-zip-input"
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (!f.name.toLowerCase().endsWith('.zip')) {
                        toast.error('Please select a .zip file');
                        return;
                      }
                      if (f.size > 50 * 1024 * 1024) {
                        toast.error('File too large (max 50MB)');
                        return;
                      }
                      setUploadFile(f);
                      if (!uploadName) {
                        setUploadName(f.name.replace(/\.zip$/i, '').replace(/-main$|-master$/, ''));
                      }
                    }
                  }}
                />
                {uploadFile ? (
                  <>
                    <FileArchive className="h-6 w-6 text-green-400" />
                    <p className="font-mono text-sm text-white">{uploadFile.name}</p>
                    <p className="text-xs text-[#5a6480]">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-[#5a6480]" />
                    <p className="text-sm text-white">Click to select a ZIP file</p>
                    <p className="text-xs text-[#5a6480]">Max 50MB</p>
                  </>
                )}
              </div>

              {/* Project name */}
              <div className="space-y-2">
                <Label htmlFor="onboarding-project-name" className="text-[#8892b0]">Project Name</Label>
                <Input
                  id="onboarding-project-name"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="my-project"
                  maxLength={200}
                  className="border-[#1e2a4a] bg-[#0d1321] text-white placeholder:text-[#5a6480]"
                />
              </div>

              <Button
                onClick={handleUploadZip}
                disabled={!uploadFile || !uploadName.trim() || uploading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {uploading ? 'Uploading...' : 'Upload & Scan'}
              </Button>

              <Button
                variant="link"
                onClick={() => { setOnboardingMode('github'); setStep(1); }}
                className="w-full text-[#5a6480] text-xs"
              >
                Back to GitHub connect
              </Button>
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
                {scanProgress < 100
                  ? onboardingMode === 'upload'
                    ? 'Analyzing your uploaded project for AI patterns...'
                    : `Analyzing ${selectedRepoIds.length} repositories for AI patterns...`
                  : 'Redirecting to your dashboard...'}
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
