import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useExamStore } from '../../stores/examStore';

interface TimerProps {
  onExpire?: () => void;
  className?: string;
}

export function Timer({ onExpire, className = '' }: TimerProps) {
  const { timeRemaining, setTimeRemaining } = useExamStore();
  const [isWarningShown, setIsWarningShown] = useState(false);
  const [isCriticalShown, setIsCriticalShown] = useState(false);

  useEffect(() => {
    if (timeRemaining <= 0) {
      onExpire?.();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev: number) => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onExpire, setTimeRemaining]);

  useEffect(() => {
    // 15分钟警告
    if (timeRemaining <= 900 && !isWarningShown) {
      setIsWarningShown(true);
    }
    
    // 5分钟严重警告
    if (timeRemaining <= 300 && !isCriticalShown) {
      setIsCriticalShown(true);
    }
  }, [timeRemaining, isWarningShown, isCriticalShown]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerStyle = () => {
    if (timeRemaining <= 300) { // 5 minutes
      return 'bg-red-100 text-red-700 border-red-200 animate-pulse';
    }
    if (timeRemaining <= 900) { // 15 minutes
      return 'bg-amber-100 text-amber-700 border-amber-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getWarningIcon = () => {
    if (timeRemaining <= 300) {
      return <AlertTriangle className="w-4 h-4 animate-bounce" />;
    }
    return <Clock className="w-4 h-4" />;
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border font-semibold text-sm transition-all ${getTimerStyle()} ${className}`}>
      {getWarningIcon()}
      <span className="tabular-nums">{formatTime(timeRemaining)}</span>
      
      {timeRemaining <= 300 && (
        <span className="text-xs font-medium animate-pulse">
          紧急
        </span>
      )}
    </div>
  );
}
