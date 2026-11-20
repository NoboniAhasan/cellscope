import { CellMeasurement } from '../../types';

interface ObjectDetailCardProps {
  measurement: CellMeasurement | null;
  onDeselect: () => void;
}

export function ObjectDetailCard({ measurement, onDeselect }: ObjectDetailCardProps) {
  if (!measurement) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center text-xs text-slate-500">
        <p>No candidate object selected.</p>
        <p className="mt-0.5 text-slate-400">
          Click an outline on the canvas or a row in the table to inspect.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-cyan-400 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
          <h3 className="font-bold text-slate-900 text-sm">
            Candidate Object #{measurement.id}
          </h3>
        </div>
        <button
          type="button"
          onClick={onDeselect}
          className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
        >
          Deselect ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="block text-slate-400 text-[10px] uppercase font-semibold">Area</span>
          <span className="text-base font-bold text-slate-800 font-mono">
            {measurement.area} <span className="text-xs font-normal text-slate-500">px²</span>
          </span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="block text-slate-400 text-[10px] uppercase font-semibold">Perimeter</span>
          <span className="text-base font-bold text-slate-800 font-mono">
            {measurement.perimeter.toFixed(1)} <span className="text-xs font-normal text-slate-500">px</span>
          </span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="block text-slate-400 text-[10px] uppercase font-semibold">Circularity</span>
          <span className="text-base font-bold text-slate-800 font-mono">
            {measurement.circularity.toFixed(3)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">4πA/P²</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="block text-slate-400 text-[10px] uppercase font-semibold">Centroid</span>
          <span className="text-sm font-bold text-slate-800 font-mono">
            ({measurement.centroid.x}, {measurement.centroid.y})
          </span>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
        <span className="font-semibold text-slate-700">Bounding Box: </span>
        <span>
          X: {measurement.bbox.x}, Y: {measurement.bbox.y}, W: {measurement.bbox.width}px, H:{' '}
          {measurement.bbox.height}px
        </span>
      </div>
    </div>
  );
}
