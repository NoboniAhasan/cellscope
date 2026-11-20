import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CellMeasurement } from '../../types';

interface SizeHistogramProps {
  measurements: CellMeasurement[];
  minAreaFilter: number;
  onMinAreaFilterChange: (val: number) => void;
}

export function SizeHistogram({
  measurements,
  minAreaFilter,
  onMinAreaFilterChange,
}: SizeHistogramProps) {
  const { chartData, minArea, maxArea } = useMemo(() => {
    if (measurements.length === 0) {
      return { chartData: [], minArea: 0, maxArea: 1000 };
    }

    const areas = measurements.map((m) => m.area);
    const min = Math.min(...areas);
    const max = Math.max(...areas);

    const binCount = 5;
    const step = Math.max(1, Math.ceil((max - min) / binCount));

    const bins = Array.from({ length: binCount }, (_, i) => {
      const start = min + i * step;
      const end = start + step;
      return {
        range: `${start}-${end}`,
        count: 0,
        start,
        end,
      };
    });

    for (const area of areas) {
      for (const bin of bins) {
        if (area >= bin.start && area < bin.end) {
          bin.count++;
          break;
        } else if (area === max && bin === bins[bins.length - 1]) {
          bin.count++;
          break;
        }
      }
    }

    return {
      chartData: bins.map((b) => ({ range: b.range, count: b.count })),
      minArea: min,
      maxArea: max,
    };
  }, [measurements]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Candidate Object Size Distribution
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Histogram of candidate object areas (px²)
          </p>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Range: {minArea} - {maxArea} px²
        </span>
      </div>

      <div className="h-44 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} name="Candidate Objects" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            No object measurements available
          </div>
        )}
      </div>

      {/* Min Area Display Filter (Non-mutating display filter per spec) */}
      <div className="pt-3 border-t border-slate-100 space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-700">Display Min-Area Filter</span>
          <span className="font-mono text-teal-700 font-bold">
            ≥ {minAreaFilter} px²
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(100, maxArea)}
          step={20}
          value={minAreaFilter}
          onChange={(e) => onMinAreaFilterChange(Number(e.target.value))}
          className="w-full accent-teal-600"
        />
        <p className="text-[10px] text-slate-400">
          ℹ️ Hides candidate objects smaller than {minAreaFilter} px² from view only. Does not delete data from the experiment run or CSV export.
        </p>
      </div>
    </div>
  );
}
