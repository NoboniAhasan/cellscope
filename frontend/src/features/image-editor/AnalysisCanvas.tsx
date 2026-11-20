import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Rect, Circle } from 'react-konva';
import { CellMeasurement } from '../../types';

interface AnalysisCanvasProps {
  imageUrl: string;
  measurements: CellMeasurement[];
  selectedObjectId: number | null;
  onSelectObject: (id: number | null) => void;
  filteredMeasurements: CellMeasurement[];
}

export type CanvasViewMode = 'outlines' | 'mask' | 'raw';

export function AnalysisCanvas({
  imageUrl,
  measurements,
  selectedObjectId,
  onSelectObject,
  filteredMeasurements,
}: AnalysisCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [viewMode, setViewMode] = useState<CanvasViewMode>('outlines');
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 700, height: 480 });

  // Load image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
      // Auto-fit image to container
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth || 700;
        const scale = Math.min(cw / (img.width || 600), 480 / (img.height || 450), 1);
        setStageScale(scale);
      }
    };
  }, [imageUrl]);

  // Track container resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth || 700,
          height: 480,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const mousePointTo = {
      x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
      y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.2, Math.min(newScale, 6));

    setStageScale(clampedScale);
    setStagePosition({
      x: -(mousePointTo.x - stage.getPointerPosition().x / clampedScale) * clampedScale,
      y: -(mousePointTo.y - stage.getPointerPosition().y / clampedScale) * clampedScale,
    });
  };

  const resetZoom = () => {
    setStageScale(1);
    setStagePosition({ x: 0, y: 0 });
  };

  // Convert polygon coordinates [x, y] to flat array [x0, y0, x1, y1...] for Konva Line
  const toFlatPoints = (contour: Array<[number, number]>): number[] => {
    return contour.flatMap(([x, y]) => [x, y]);
  };

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-800 flex flex-col">
      {/* Canvas Toolbar */}
      <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        {/* Mode Toggles */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('outlines')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              viewMode === 'outlines'
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Candidate Outlines
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mask')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              viewMode === 'mask'
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Binary Mask
          </button>
          <button
            type="button"
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              viewMode === 'raw'
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw Specimen
          </button>
        </div>

        {/* Zoom & Pan Controls */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-400 text-[11px]">
            {Math.round(stageScale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setStageScale((s) => Math.min(s * 1.25, 6))}
            className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold"
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setStageScale((s) => Math.max(s / 1.25, 0.2))}
            className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold"
            title="Zoom Out"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium text-[11px]"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Interactive Stage */}
      <div
        ref={containerRef}
        className="w-full h-[480px] bg-slate-950 cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center relative"
      >
        <Stage
          width={containerSize.width}
          height={containerSize.height}
          onWheel={handleWheel}
          draggable
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePosition.x}
          y={stagePosition.y}
          onDragEnd={(e) => setStagePosition({ x: e.target.x(), y: e.target.y() })}
          onClick={(e) => {
            // Clicking empty canvas space deselects
            if (e.target === e.target.getStage()) {
              onSelectObject(null);
            }
          }}
        >
          {/* Layer 1: Image Background or Mask canvas */}
          <Layer>
            {viewMode === 'mask' ? (
              <Rect
                x={0}
                y={0}
                width={image?.width || 800}
                height={image?.height || 600}
                fill="#000000"
              />
            ) : (
              image && <KonvaImage image={image} x={0} y={0} />
            )}

            {/* Layer 2: Outlines / Mask Shapes */}
            {viewMode !== 'raw' &&
              filteredMeasurements.map((m) => {
                const isSelected = selectedObjectId === m.id;
                const points = toFlatPoints(m.contour);

                if (viewMode === 'mask') {
                  return (
                    <Line
                      key={`mask-${m.id}`}
                      points={points}
                      closed
                      fill="#ffffff"
                      stroke="#ffffff"
                      strokeWidth={1}
                      onClick={() => onSelectObject(m.id)}
                    />
                  );
                }

                return (
                  <Line
                    key={`outline-${m.id}`}
                    points={points}
                    closed
                    stroke={isSelected ? '#06b6d4' : '#ef4444'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    fill={isSelected ? 'rgba(6, 182, 212, 0.25)' : 'transparent'}
                    shadowColor={isSelected ? '#06b6d4' : undefined}
                    shadowBlur={isSelected ? 10 : 0}
                    onClick={() => onSelectObject(m.id)}
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = 'pointer';
                    }}
                    onMouseLeave={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = 'default';
                    }}
                  />
                );
              })}

            {/* Selected Object Indicator (Centroid & Bounding Box) */}
            {selectedObjectId && (
              (() => {
                const selected = measurements.find((m) => m.id === selectedObjectId);
                if (!selected || viewMode === 'raw') return null;
                return (
                  <>
                    <Rect
                      x={selected.bbox.x}
                      y={selected.bbox.y}
                      width={selected.bbox.width}
                      height={selected.bbox.height}
                      stroke="#06b6d4"
                      strokeWidth={1}
                      dash={[4, 4]}
                    />
                    <Circle
                      x={selected.centroid.x}
                      y={selected.centroid.y}
                      radius={3}
                      fill="#06b6d4"
                    />
                  </>
                );
              })()
            )}
          </Layer>
        </Stage>

        {/* Canvas Overlay Legend */}
        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Candidate Outlines</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Selected Object</span>
          </div>
        </div>
      </div>
    </div>
  );
}
