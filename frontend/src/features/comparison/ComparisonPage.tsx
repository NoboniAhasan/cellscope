import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function ComparisonPage() {
  const [selectedRunIds, setSelectedRunIds] = useState<number[]>([]);

  // 1. Fetch Experiments and all their runs
  const { data: experiments = [], isLoading: isLoadingExp } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => api.listExperiments(),
  });

  const { data: allRuns = [], isLoading: isLoadingRuns } = useQuery({
    queryKey: ['allRuns'],
    queryFn: async () => {
      const runsPerExp = await Promise.all(experiments.map((e) => api.listRuns(e.id)));
      return runsPerExp.flat();
    },
    enabled: experiments.length > 0,
  });

  // Auto-select first 2 runs if none selected yet
  useState(() => {
    if (allRuns.length >= 2 && selectedRunIds.length === 0) {
      setSelectedRunIds([allRuns[0].id, allRuns[1].id]);
    }
  });

  // 2. Fetch Comparison Data
  const { data: comparisonData, isLoading: isLoadingComparison } = useQuery({
    queryKey: ['comparison', selectedRunIds],
    queryFn: () => api.compareRuns(selectedRunIds),
    enabled: selectedRunIds.length >= 2,
  });

  const toggleRunSelection = (runId: number) => {
    setSelectedRunIds((prev) =>
      prev.includes(runId) ? prev.filter((id) => id !== runId) : [...prev, runId],
    );
  };

  const runsToCompare = comparisonData?.runs || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Multi-Run Comparison</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cross-compare segmentation metrics and distributions across versions and experiments
          </p>
        </div>
        <Badge variant="demo">Demo result</Badge>
      </div>

      {/* Run Selection Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-bold text-slate-900">
            Select Runs to Compare <span className="text-xs font-normal text-slate-400">(select 2 or more)</span>
          </h2>
          <span className="text-xs font-semibold px-2.5 py-0.5 bg-teal-50 text-teal-800 rounded-full">
            {selectedRunIds.length} Selected
          </span>
        </div>

        {isLoadingExp || isLoadingRuns ? (
          <div className="py-6 flex justify-center">
            <LoadingSpinner size="sm" label="Loading available runs..." />
          </div>
        ) : allRuns.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">
            No analysis runs found. Run analysis on at least 2 versions or experiments to enable comparison.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {allRuns.map((r) => {
              const exp = experiments.find((e) => e.id === r.experimentId);
              const isSelected = selectedRunIds.includes(r.id);
              return (
                <div
                  key={r.id}
                  onClick={() => toggleRunSelection(r.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/50 text-teal-950 ring-1 ring-teal-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 line-clamp-1">
                      {exp?.title || 'Experiment'}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="font-bold text-teal-700">v{r.version}</span>
                      <span>•</span>
                      <span className="uppercase">{r.kind}</span>
                      <span>•</span>
                      <span>{r.objectCount} objects</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // handled by parent div
                    className="accent-teal-600 w-4 h-4 rounded"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {selectedRunIds.length < 2 ? (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-10 text-center text-xs text-slate-500">
          Please check at least 2 runs above to render comparative charts and statistics.
        </div>
      ) : isLoadingComparison ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" label="Computing cross-run metrics..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Comparison Bar Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Object Count */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Candidate Object Count
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={runsToCompare} margin={{ top: 5, right: 10, left: -20, bottom: 25 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" stroke="#94a3b8" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="objectCount" fill="#0d9488" name="Object Count" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Mean Area (px²) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mean Area (px²)
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={runsToCompare} margin={{ top: 5, right: 10, left: -10, bottom: 25 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="meanArea" fill="#6366f1" name="Mean Area (px²)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Mean Circularity */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mean Circularity (4πA/P²)
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={runsToCompare} margin={{ top: 5, right: 10, left: -10, bottom: 25 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" stroke="#94a3b8" />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="meanCircularity" fill="#f59e0b" name="Circularity" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Comparison Summary Metrics
              </h3>
              <span className="text-xs text-slate-400">Areas are in px² (uncalibrated scale)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Run / Version Label</th>
                    <th className="py-2.5 px-4">Candidate Count</th>
                    <th className="py-2.5 px-4">Mean Area (px²)</th>
                    <th className="py-2.5 px-4">Mean Perimeter (px)</th>
                    <th className="py-2.5 px-4">Mean Circularity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runsToCompare.map((item) => (
                    <tr key={item.runId} className="hover:bg-slate-50/80 text-slate-700">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{item.label}</td>
                      <td className="py-2.5 px-4 font-mono font-bold">{item.objectCount}</td>
                      <td className="py-2.5 px-4 font-mono">{item.meanArea.toLocaleString()} px²</td>
                      <td className="py-2.5 px-4 font-mono">{item.meanPerimeter.toFixed(1)} px</td>
                      <td className="py-2.5 px-4 font-mono">{item.meanCircularity.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
