import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm shadow-blue-200',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm shadow-red-200',
  ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
