import { create } from 'zustand';

export interface GitHubRepo {
  github_id: number;
  name: string;
  full_name: string;
  default_branch: string;
  language: string | null;
  is_private: boolean;
}

interface OnboardingStore {
  step: 1 | 2 | 3 | 4;
  onboardingMode: 'github' | 'upload';
  githubRepos: GitHubRepo[];
  selectedRepoIds: number[];
  aiProvider: string;
  scanProgress: number;
  uploadedRepoId: string | null;
  setStep: (step: 1 | 2 | 3 | 4) => void;
  setOnboardingMode: (mode: 'github' | 'upload') => void;
  setGithubRepos: (repos: GitHubRepo[]) => void;
  toggleRepo: (githubId: number) => void;
  setAiProvider: (provider: string) => void;
  setScanProgress: (progress: number) => void;
  setUploadedRepoId: (id: string | null) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  step: 1,
  onboardingMode: 'github',
  githubRepos: [],
  selectedRepoIds: [],
  aiProvider: '',
  scanProgress: 0,
  uploadedRepoId: null,
  setStep: (step) => set({ step }),
  setOnboardingMode: (mode) => set({ onboardingMode: mode }),
  setGithubRepos: (repos) => set({ githubRepos: repos }),
  toggleRepo: (githubId) =>
    set((state) => ({
      selectedRepoIds: state.selectedRepoIds.includes(githubId)
        ? state.selectedRepoIds.filter((id) => id !== githubId)
        : [...state.selectedRepoIds, githubId],
    })),
  setAiProvider: (provider) => set({ aiProvider: provider }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  setUploadedRepoId: (id) => set({ uploadedRepoId: id }),
  reset: () => set({ step: 1, onboardingMode: 'github', githubRepos: [], selectedRepoIds: [], aiProvider: '', scanProgress: 0, uploadedRepoId: null }),
}));
