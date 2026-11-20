import { AnalysisRun, CellMeasurement } from '../../types';

interface VersionHistoryPanelProps {
  runs: AnalysisRun[];
  activeRunId: number;
  onSelectRun: (runId: number) => void;
  currentMeasurements: CellMeasurement[];
  v1Measurements: CellMeasurement[];
}

export function VersionHistoryPanel({
  runs,
  activeRunId,
  onSelectRun,
  currentMeasurements,
  v1Measurements,
}: VersionHistoryPanelProps) {
  const currentRun = runs.find((r) => r.id === activeRunId);
  const v1Run = runs.find((r) => r.version === 1);

  // Compute metric comparisons between current run and v1
  const countDiff = currentMeasurements.length - v1Measurements.length;
  const currentMeanArea =
    currentMeasurements.length > 0
      ? Math.round(currentMeasurements.reduce((acc, m) => acc + m.area, 0) / currentMeasurements.length)
      : 0;
  const v1MeanArea =
    v1Measurements.length > 0
      ? Math.round(v1Measurements.reduce((acc, m) => acc + m.area, 0) / v1Measurements.length)
      : 0;
  const areaDiff = currentMeanArea - v1MeanArea;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Version Chain & History</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable analysis versions for this specimen
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
          {runs.length} {runs.length === 1 ? 'Version' : 'Versions'}
        </span>
      </div>

      {/* Version Chain List */}
      <div className="space-y-2">
        {runs.map((r) => {
          const isActive = r.id === activeRunId;
          return (
            <div
              key={r.id}
              onClick={() => onSelectRun(r.id)}
              className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-3 ${
                isActive
                  ? 'border-teal-600 bg-teal-50/40 text-teal-950 ring-1 ring-teal-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">v{r.version}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                      r.kind === 'automated'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {r.kind}
                  </span>
                  {r.parentRunId && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      (parent: v{runs.find((p) => p.id === r.parentRunId)?.version || 1})
                    </span>
                  )}
                </div>

                {r.changeNote && (
                  <p className="text-slate-600 italic text-[11px]">
                    &ldquo;{r.changeNote}&rdquo;
                  </p>
                )}

                <p className="text-[10px] text-slate-400">
                  {new Date(r.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="font-bold text-sm block">{r.objectCount}</span>
                <span className="text-[10px] text-slate-500">objects</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Version Comparison Diff Card (if v2+ active) */}
      {currentRun && currentRun.version > 1 && v1Run && (
        <div className="pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded-xl border space-y-2 text-xs">
          <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider">
            Comparison vs. Automated v1
          </span>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Count Diff</span>
              <span
                className={`font-mono font-bold text-sm ${
                  countDiff > 0 ? 'text-emerald-700' : countDiff < 0 ? 'text-red-700' : 'text-slate-700'
                }`}
              >
                {countDiff > 0 ? `+${countDiff}` : countDiff}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Mean Area Diff</span>
              <span
                className={`font-mono font-bold text-sm ${
                  areaDiff > 0 ? 'text-emerald-700' : areaDiff < 0 ? 'text-red-700' : 'text-slate-700'
                }`}
              >
                {areaDiff > 0 ? `+${areaDiff}` : areaDiff} px²
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
