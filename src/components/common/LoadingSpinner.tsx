import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ text = 'Loading...', fullScreen = false }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-gray-600 font-medium">{text}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-gray-500 text-sm">{text}</p>
    </div>
  );
}
