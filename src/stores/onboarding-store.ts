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
  githubRepos: GitHubRepo[];
  selectedRepoIds: number[];
  aiProvider: string;
  scanProgress: number;
  setStep: (step: 1 | 2 | 3 | 4) => void;
  setGithubRepos: (repos: GitHubRepo[]) => void;
  toggleRepo: (githubId: number) => void;
  setAiProvider: (provider: string) => void;
  setScanProgress: (progress: number) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  step: 1,
  githubRepos: [],
  selectedRepoIds: [],
  aiProvider: '',
  scanProgress: 0,
  setStep: (step) => set({ step }),
  setGithubRepos: (repos) => set({ githubRepos: repos }),
  toggleRepo: (githubId) =>
    set((state) => ({
      selectedRepoIds: state.selectedRepoIds.includes(githubId)
        ? state.selectedRepoIds.filter((id) => id !== githubId)
        : [...state.selectedRepoIds, githubId],
    })),
  setAiProvider: (provider) => set({ aiProvider: provider }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  reset: () => set({ step: 1, githubRepos: [], selectedRepoIds: [], aiProvider: '', scanProgress: 0 }),
}));
