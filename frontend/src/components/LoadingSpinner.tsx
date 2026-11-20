interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  label = 'Loading...',
  className = '',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`} role="status">
      <div
        className={`${sizeClasses[size]} border-teal-600 border-t-transparent rounded-full animate-spin`}
      />
      {label && <span className="text-xs text-slate-500 font-medium">{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  );
}
