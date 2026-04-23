import { useMemo } from 'react';
import { useUiStore } from '../stores/uiStore';

export function useToast() {
  const { addToast } = useUiStore();

  return useMemo(
    () => ({
      success: (message: string) => addToast('success', message),
      error: (message: string) => addToast('error', message),
      warning: (message: string) => addToast('warning', message),
      info: (message: string) => addToast('info', message),
    }),
    [addToast]
  );
}
