import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface UiState {
  isGlobalLoading: boolean;
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isGlobalLoading: false,
  toasts: [],
  setGlobalLoading: (isGlobalLoading) => set({ isGlobalLoading }),
  addToast: (type, message) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: crypto.randomUUID(), type, message },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
