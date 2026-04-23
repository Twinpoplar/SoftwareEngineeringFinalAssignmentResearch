import { useEffect, useRef } from 'react';
import { useExamStore } from '../stores/examStore';

export function useCountdown(onExpire?: () => void) {
  const { timeRemaining, setTimeRemaining } = useExamStore();
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (timeRemaining <= 0) {
      onExpire?.();
      return;
    }

    const tick = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const delta = timestamp - lastTimeRef.current;
      if (delta >= 1000) {
        lastTimeRef.current = timestamp;
        setTimeRemaining(Math.max(0, timeRemaining - Math.floor(delta / 1000)));
      }
      if (timeRemaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = 0;
    };
  }, [timeRemaining, setTimeRemaining, onExpire]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isWarning = timeRemaining <= 900 && timeRemaining > 300;
  const isDanger = timeRemaining <= 300;

  return { timeRemaining, minutes, seconds, isWarning, isDanger };
}
