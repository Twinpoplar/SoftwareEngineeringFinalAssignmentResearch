/**
 * 用户信息、token、登录状态
 * Zustand + persist：刷新不丢失
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setApiToken } from '../lib/apiClient';
import type { Profile } from '../types';

interface AuthState {
  user: Profile | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: Profile | null) => void;
  setToken: (token: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => void;
}

//在任何组件里调用，都能拿到同一个用户信息
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        setApiToken(token);
        set({ token });
      },
      setIsLoading: (isLoading) => set({ isLoading }),
      logout: () => {
        setApiToken(null);
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setApiToken(state.token);
        }
      },
    }
  )
);
