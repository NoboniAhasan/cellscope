import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Rect, Circle } from 'react-konva';
import { CellMeasurement } from '../../types';

export type CanvasViewMode = 'outlines' | 'mask' | 'raw';
export type CanvasEditMode = 'inspect' | 'add' | 'adjust';

interface AnalysisCanvasProps {
  imageUrl: string;
  measurements: CellMeasurement[];
  selectedObjectId: number | null;
  onSelectObject: (id: number | null) => void;
  filteredMeasurements: CellMeasurement[];
  editMode?: CanvasEditMode;
  onAddObject?: (contour: Array<[number, number]>) => void;
  onAdjustContour?: (id: number, newContour: Array<[number, number]>) => void;
}

export function AnalysisCanvas({
  imageUrl,
  measurements,
  selectedObjectId,
  onSelectObject,
  filteredMeasurements,
  editMode = 'inspect',
  onAddObject,
  onAdjustContour,
}: AnalysisCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [viewMode, setViewMode] = useState<CanvasViewMode>('outlines');
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 700, height: 480 });

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth || 700;
        const scale = Math.min(cw / (img.width || 600), 480 / (img.height || 450), 1);
        setStageScale(scale);
      }
    };
  }, [imageUrl]);

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

  const toFlatPoints = (contour: Array<[number, number]>): number[] => {
    return contour.flatMap(([x, y]) => [x, y]);
  };

  // Click on stage: handle adding missed object when editMode === 'add'
  const handleStageClick = (e: any) => {
    const stage = e.target.getStage();
    if (!stage) return;

    if (editMode === 'add' && onAddObject) {
      const pos = stage.getPointerPosition();
      const clickX = (pos.x - stagePosition.x) / stageScale;
      const clickY = (pos.y - stagePosition.y) / stageScale;

      // Generate a circular 16-point polygon around click point
      const radius = 22;
      const newContour: Array<[number, number]> = [];
      const numPoints = 16;
      for (let i = 0; i < numPoints; i++) {
        const theta = (i * 2 * Math.PI) / numPoints;
        const px = clickX + radius * Math.cos(theta);
        const py = clickY + radius * Math.sin(theta);
        newContour.push([Math.round(px * 10) / 10, Math.round(py * 10) / 10]);
      }
      onAddObject(newContour);
      return;
    }

    // Otherwise, clicking empty space deselects
    if (e.target === stage) {
      onSelectObject(null);
    }
  };

  const selectedMeasurement = measurements.find((m) => m.id === selectedObjectId);

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-800 flex flex-col">
      {/* Canvas Toolbar */}
      <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('outlines')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              viewMode === 'outlines' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Candidate Outlines
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mask')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              viewMode === 'mask' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Binary Mask
          </button>
          <button
            type="button"
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              viewMode === 'raw' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw Specimen
          </button>
        </div>

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
        className={`w-full h-[480px] bg-slate-950 overflow-hidden flex items-center justify-center relative ${
          editMode === 'add' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <Stage
          width={containerSize.width}
          height={containerSize.height}
          onWheel={handleWheel}
          draggable={editMode !== 'add'}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePosition.x}
          y={stagePosition.y}
          onDragEnd={(e) => {
            if (e.target === e.target.getStage()) {
              setStagePosition({ x: e.target.x(), y: e.target.y() });
            }
          }}
          onClick={handleStageClick}
        >
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

            {viewMode !== 'raw' &&
              filteredMeasurements.map((m) => {
                const isSelected = selectedObjectId === m.id;
                const points = toFlatPoints(m.contour);

                let strokeColor = '#ef4444'; // default automated
                if (m.source === 'added') strokeColor = '#10b981';
                else if (m.source === 'adjusted') strokeColor = '#f59e0b';
                if (isSelected) strokeColor = '#06b6d4';

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
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    fill={isSelected ? 'rgba(6, 182, 212, 0.25)' : 'transparent'}
                    shadowColor={isSelected ? '#06b6d4' : undefined}
                    shadowBlur={isSelected ? 10 : 0}
                    onClick={() => onSelectObject(m.id)}
                    onMouseEnter={(e) => {
                      if (editMode !== 'add') {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'pointer';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (editMode !== 'add') {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'default';
                      }
                    }}
                  />
                );
              })}

            {/* Selected Object Indicator */}
            {selectedMeasurement && viewMode !== 'raw' && (
              <>
                <Rect
                  x={selectedMeasurement.bbox.x}
                  y={selectedMeasurement.bbox.y}
                  width={selectedMeasurement.bbox.width}
                  height={selectedMeasurement.bbox.height}
                  stroke="#06b6d4"
                  strokeWidth={1}
                  dash={[4, 4]}
                />
                <Circle
                  x={selectedMeasurement.centroid.x}
                  y={selectedMeasurement.centroid.y}
                  radius={3}
                  fill="#06b6d4"
                />

                {/* Vertex Adjustment Anchor Handles (when in 'adjust' mode) */}
                {editMode === 'adjust' &&
                  selectedMeasurement.contour.map(([vx, vy], idx) => (
                    <Circle
                      key={`vertex-${idx}`}
                      x={vx}
                      y={vy}
                      radius={4.5}
                      fill="#06b6d4"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      draggable
                      onDragMove={(e) => {
                        if (onAdjustContour) {
                          const updatedContour = selectedMeasurement.contour.map((pt, i) =>
                            i === idx
                              ? ([Math.round(e.target.x() * 10) / 10, Math.round(e.target.y() * 10) / 10] as [
                                  number,
                                  number,
                                ])
                              : pt,
                          );
                          onAdjustContour(selectedMeasurement.id, updatedContour);
                        }
                      }}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'move';
                      }}
                      onMouseLeave={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'default';
                      }}
                    />
                  ))}
              </>
            )}
          </Layer>
        </Stage>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Automated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Added</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Adjusted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
