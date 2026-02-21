import { create } from 'zustand';

export interface TwinState {
  overallScore: number | null;
  dimensionScores: Record<string, number> | null;
  setTwin: (overall: number, dimensions: Record<string, number>) => void;
  clear: () => void;
}

export const useTwinStore = create<TwinState>((set) => ({
  overallScore: null,
  dimensionScores: null,
  setTwin: (overallScore, dimensionScores) => set({ overallScore, dimensionScores }),
  clear: () => set({ overallScore: null, dimensionScores: null }),
}));
