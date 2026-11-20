import { useState, useMemo } from 'react';
import { CellMeasurement } from '../../types';

interface MeasurementsTableProps {
  measurements: CellMeasurement[];
  selectedObjectId: number | null;
  onSelectObject: (id: number) => void;
}

type SortField = 'id' | 'area' | 'perimeter' | 'circularity';
type SortDirection = 'asc' | 'desc';

export function MeasurementsTable({
  measurements,
  selectedObjectId,
  onSelectObject,
}: MeasurementsTableProps) {
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedMeasurements = useMemo(() => {
    return [...measurements].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [measurements, sortField, sortDirection]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Candidate Object Measurements
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Areas are in px² (uncalibrated scale). Click any row to inspect candidate contour.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full self-start sm:self-auto">
          {measurements.length} Candidate Objects
        </span>
      </div>

      <div className="overflow-x-auto max-h-[360px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200 z-10">
            <tr>
              <th
                onClick={() => handleSort('id')}
                className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-100 transition"
              >
                ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('area')}
                className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-100 transition"
              >
                Area (px²) {sortField === 'area' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('perimeter')}
                className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-100 transition"
              >
                Perimeter (px) {sortField === 'perimeter' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('circularity')}
                className="py-2.5 px-3.5 cursor-pointer hover:bg-slate-100 transition"
              >
                Circularity (4πA/P²) {sortField === 'circularity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="py-2.5 px-3.5">Centroid (X, Y)</th>
              <th className="py-2.5 px-3.5">Bounding Box</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedMeasurements.map((m) => {
              const isSelected = selectedObjectId === m.id;
              return (
                <tr
                  key={m.id}
                  onClick={() => onSelectObject(m.id)}
                  className={`cursor-pointer transition ${
                    isSelected
                      ? 'bg-cyan-50 font-medium text-cyan-950'
                      : 'hover:bg-slate-50/80 text-slate-700'
                  }`}
                >
                  <td className="py-2 px-3.5 font-mono">#{m.id}</td>
                  <td className="py-2 px-3.5 font-mono">{m.area.toLocaleString()} px²</td>
                  <td className="py-2 px-3.5 font-mono">{m.perimeter.toFixed(1)}</td>
                  <td className="py-2 px-3.5 font-mono">{m.circularity.toFixed(3)}</td>
                  <td className="py-2 px-3.5 font-mono">
                    ({m.centroid.x}, {m.centroid.y})
                  </td>
                  <td className="py-2 px-3.5 font-mono text-slate-500 text-[11px]">
                    {m.bbox.width} × {m.bbox.height}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
