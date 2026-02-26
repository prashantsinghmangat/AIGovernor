import { create } from 'zustand';

interface FilterStore {
  period: '7d' | '30d' | '90d';
  severity: 'all' | 'high' | 'medium' | 'low';
  repositoryId: string | null;
  setPeriod: (period: '7d' | '30d' | '90d') => void;
  setSeverity: (severity: 'all' | 'high' | 'medium' | 'low') => void;
  setRepositoryId: (id: string | null) => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  period: '30d',
  severity: 'all',
  repositoryId: null,
  setPeriod: (period) => set({ period }),
  setSeverity: (severity) => set({ severity }),
  setRepositoryId: (repositoryId) => set({ repositoryId }),
}));
