import { create } from 'zustand';

export interface AuthUser {
  id: string;
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  hasPlaidConnection: boolean;
  hasTwin: boolean;
}

interface AuthState {
  user: AuthUser | null;
  idToken: string | null;
  setUser: (user: AuthUser | null) => void;
  setIdToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  idToken: null,
  setUser: (user) => set({ user }),
  setIdToken: (idToken) => set({ idToken }),
  logout: () => set({ user: null, idToken: null }),
}));
