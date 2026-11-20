interface BadgeProps {
  children: React.ReactNode;
  variant?: 'demo' | 'researcher' | 'reviewer' | 'neutral' | 'success' | 'warning';
  className?: string;
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const variantStyles = {
    demo: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
    researcher: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    reviewer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {variant === 'demo' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
