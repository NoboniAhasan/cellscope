import { QualityWarning } from '../../types';

interface QualityWarningBannerProps {
  warnings: QualityWarning[];
  title?: string;
}

export function QualityWarningBanner({ warnings, title = 'Quality Warnings & Feedback' }: QualityWarningBannerProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-4 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-amber-700 font-bold text-sm">⚠️ {title}</span>
        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
          {warnings.length} {warnings.length === 1 ? 'Notice' : 'Notices'}
        </span>
      </div>

      <div className="space-y-2 pt-1">
        {warnings.map((w, idx) => (
          <div
            key={idx}
            className="text-xs bg-white/70 border border-amber-200 rounded-lg p-2.5 text-slate-700 space-y-1"
          >
            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-amber-900">
              <span className="px-1.5 py-0.2 bg-amber-100 rounded">{w.code}</span>
              <span>{w.message}</span>
            </div>
            {w.suggestion && (
              <p className="text-slate-600 pl-1 text-[11px] leading-relaxed">
                <span className="font-semibold text-slate-700">Suggestion: </span>
                {w.suggestion}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
