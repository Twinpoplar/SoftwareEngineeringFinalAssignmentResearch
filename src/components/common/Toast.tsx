import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
};

const bg = {
  success: 'border-l-4 border-emerald-500 bg-white',
  error: 'border-l-4 border-red-500 bg-white',
  warning: 'border-l-4 border-amber-500 bg-white',
  info: 'border-l-4 border-blue-500 bg-white',
};

function ToastItem({ id, type, message }: { id: string; type: keyof typeof icons; message: string }) {
  const removeToast = useUiStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), 4000);
    return () => clearTimeout(timer);
  }, [id, removeToast]);

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg ${bg[type]} min-w-72 max-w-sm animate-slide-in`}>
      {icons[type]}
      <p className="flex-1 text-sm text-gray-700 font-medium">{message}</p>
      <button onClick={() => removeToast(id)} className="text-gray-400 hover:text-gray-600 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}
