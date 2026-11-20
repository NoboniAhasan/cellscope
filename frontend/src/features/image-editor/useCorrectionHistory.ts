import { useState, useCallback } from 'react';
import { CellMeasurement } from '../../types';
import {
  calculateBoundingBox,
  calculateCentroid,
  calculateCircularity,
  calculatePerimeter,
  calculateShoelaceArea,
} from '../../services/mock/detector';

export interface CorrectionDiff {
  deleteObjectIds: number[];
  addObjects: Array<Pick<CellMeasurement, 'contour'>>;
  adjusted: Array<{ objectId: number; contour: Array<[number, number]> }>;
}

export function useCorrectionHistory(initialItems: CellMeasurement[]) {
  // Current working items
  const [items, setItems] = useState<CellMeasurement[]>(initialItems);
  // Undo/Redo stacks
  const [past, setPast] = useState<CellMeasurement[][]>([]);
  const [future, setFuture] = useState<CellMeasurement[][]>([]);

  // Reset to new baseline
  const reset = useCallback((newItems: CellMeasurement[]) => {
    setItems(newItems);
    setPast([]);
    setFuture([]);
  }, []);

  const pushState = (newItems: CellMeasurement[]) => {
    setPast((p) => [...p, items]);
    setItems(newItems);
    setFuture([]);
  };

  const deleteObject = useCallback(
    (id: number) => {
      const next = items.filter((m) => m.id !== id);
      pushState(next);
    },
    [items],
  );

  const addObject = useCallback(
    (contour: Array<[number, number]>) => {
      const nextId = items.length > 0 ? Math.max(...items.map((m) => m.id)) + 1 : 1;
      const area = Math.round(calculateShoelaceArea(contour));
      const perimeter = Math.round(calculatePerimeter(contour) * 10) / 10;
      const circularity = calculateCircularity(area, perimeter);
      const centroid = calculateCentroid(contour);
      const bbox = calculateBoundingBox(contour);

      const newItem: CellMeasurement = {
        id: nextId,
        runId: items[0]?.runId || 0,
        area,
        perimeter,
        circularity,
        centroid,
        bbox,
        contour,
        source: 'added',
      };

      pushState([...items, newItem]);
    },
    [items],
  );

  const adjustContour = useCallback(
    (id: number, newContour: Array<[number, number]>) => {
      const area = Math.round(calculateShoelaceArea(newContour));
      const perimeter = Math.round(calculatePerimeter(newContour) * 10) / 10;
      const circularity = calculateCircularity(area, perimeter);
      const centroid = calculateCentroid(newContour);
      const bbox = calculateBoundingBox(newContour);

      const next = items.map((m) => {
        if (m.id === id) {
          return {
            ...m,
            area,
            perimeter,
            circularity,
            centroid,
            bbox,
            contour: newContour,
            source: 'adjusted' as const,
          };
        }
        return m;
      });

      pushState(next);
    },
    [items],
  );

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setFuture((f) => [items, ...f]);
    setItems(previous);
    setPast(newPast);
  }, [past, items]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setPast((p) => [...p, items]);
    setItems(next);
    setFuture(newFuture);
  }, [future, items]);

  // Compute diff against initial baseline
  const getDiff = useCallback((): CorrectionDiff => {
    const initialMap = new Map(initialItems.map((m) => [m.id, m]));
    const currentMap = new Map(items.map((m) => [m.id, m]));

    const deleteObjectIds: number[] = [];
    const addObjects: Array<Pick<CellMeasurement, 'contour'>> = [];
    const adjusted: Array<{ objectId: number; contour: Array<[number, number]> }> = [];

    // Find deleted
    for (const [id] of initialMap) {
      if (!currentMap.has(id)) {
        deleteObjectIds.push(id);
      }
    }

    // Find added or adjusted
    for (const [id, item] of currentMap) {
      if (!initialMap.has(id) || item.source === 'added') {
        addObjects.push({ contour: item.contour });
      } else {
        const orig = initialMap.get(id)!;
        const isChanged = JSON.stringify(orig.contour) !== JSON.stringify(item.contour);
        if (isChanged || item.source === 'adjusted') {
          adjusted.push({ objectId: id, contour: item.contour });
        }
      }
    }

    return { deleteObjectIds, addObjects, adjusted };
  }, [initialItems, items]);

  const hasUnsavedChanges = past.length > 0;

  return {
    items,
    setItems,
    deleteObject,
    addObject,
    adjustContour,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    getDiff,
    hasUnsavedChanges,
    editCount: past.length,
  };
}
