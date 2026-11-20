import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCorrectionHistory } from '../../image-editor/useCorrectionHistory';
import { MockAdapter } from '../../../services/mock';
import { mockStorage } from '../../../services/mock/storage';
import { CellMeasurement } from '../../../types';

const INITIAL_TEST_ITEMS: CellMeasurement[] = [
  {
    id: 1,
    runId: 1,
    area: 200,
    perimeter: 55,
    circularity: 0.83,
    centroid: { x: 50, y: 50 },
    bbox: { x: 30, y: 30, width: 40, height: 40 },
    contour: [[30, 30], [70, 30], [70, 70], [30, 70]],
    source: 'automated',
  },
  {
    id: 2,
    runId: 1,
    area: 300,
    perimeter: 70,
    circularity: 0.77,
    centroid: { x: 150, y: 150 },
    bbox: { x: 130, y: 130, width: 40, height: 40 },
    contour: [[130, 130], [170, 130], [170, 170], [130, 170]],
    source: 'automated',
  },
  {
    id: 3,
    runId: 1,
    area: 400,
    perimeter: 80,
    circularity: 0.78,
    centroid: { x: 250, y: 250 },
    bbox: { x: 230, y: 230, width: 40, height: 40 },
    contour: [[230, 230], [270, 230], [270, 270], [230, 270]],
    source: 'automated',
  },
  {
    id: 4,
    runId: 1,
    area: 500,
    perimeter: 90,
    circularity: 0.77,
    centroid: { x: 350, y: 350 },
    bbox: { x: 330, y: 330, width: 40, height: 40 },
    contour: [[330, 330], [370, 330], [370, 370], [330, 370]],
    source: 'automated',
  },
];

describe('Milestone M3 — Correction & Versioning', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    mockStorage.reset();
    adapter = new MockAdapter();
  });

  // 1. Undo / Redo Stack Behavior
  describe('Undo/Redo Stack Behavior', () => {
    it('executes delete 3 objects, add 1, undo twice, redo once correctly', () => {
      const { result } = renderHook(() => useCorrectionHistory(INITIAL_TEST_ITEMS));

      expect(result.current.items.length).toBe(4);
      expect(result.current.canUndo).toBe(false);

      // Delete 3 objects
      act(() => result.current.deleteObject(1));
      act(() => result.current.deleteObject(2));
      act(() => result.current.deleteObject(3));
      expect(result.current.items.length).toBe(1); // only item 4 remains

      // Add 1 object
      act(() =>
        result.current.addObject([
          [10, 10],
          [30, 10],
          [30, 30],
          [10, 30],
        ]),
      );
      expect(result.current.items.length).toBe(2);

      // Undo twice: should undo addition and undo the 3rd deletion
      act(() => result.current.undo());
      expect(result.current.items.length).toBe(1);

      act(() => result.current.undo());
      expect(result.current.items.length).toBe(2); // items 3 & 4 present

      // Redo once: should redo the 3rd deletion
      act(() => result.current.redo());
      expect(result.current.items.length).toBe(1); // item 4 remains
    });
  });

  // 2. Metric Recalculation on Edit
  describe('Metric Recalculation', () => {
    it('calculates metrics for newly added object with source="added"', () => {
      const { result } = renderHook(() => useCorrectionHistory(INITIAL_TEST_ITEMS));

      // 20x20 square = area 400
      act(() =>
        result.current.addObject([
          [0, 0],
          [20, 0],
          [20, 20],
          [0, 20],
        ]),
      );

      const added = result.current.items.find((m) => m.source === 'added');
      expect(added).toBeDefined();
      expect(added!.area).toBe(400);
      expect(added!.perimeter).toBe(80);
      expect(added!.circularity).toBeGreaterThan(0.7);
      expect(added!.centroid).toEqual({ x: 10, y: 10 });
    });

    it('recalculates metrics on boundary adjustment with source="adjusted"', () => {
      const { result } = renderHook(() => useCorrectionHistory(INITIAL_TEST_ITEMS));

      // Stretch object 1 to 50x50
      act(() =>
        result.current.adjustContour(1, [
          [0, 0],
          [50, 0],
          [50, 50],
          [0, 50],
        ]),
      );

      const adjusted = result.current.items.find((m) => m.id === 1);
      expect(adjusted!.source).toBe('adjusted');
      expect(adjusted!.area).toBe(2500);
      expect(adjusted!.perimeter).toBe(200);
      expect(adjusted!.centroid).toEqual({ x: 25, y: 25 });
    });
  });

  // 3. Version Chain and Parent Run Immutability
  describe('Version Chain & saveCorrection Immutability', () => {
    it('creates version N+1 linked to parent while keeping parent run v1 identical', async () => {
      await adapter.login({ email: 'researcher@cellscope.org', password: 'password123' });

      // Run automated analysis -> v1
      const v1Run = await adapter.runAnalysis({
        experimentId: 1,
        fileId: 101,
        parameters: {
          preset: 'fluorescence',
          polarity: 'bright_on_dark',
          blurSigma: 1.5,
          thresholdMethod: 'otsu',
          minArea: 100,
          maxArea: 5000,
        },
      });

      expect(v1Run.version).toBe(1);
      expect(v1Run.kind).toBe('automated');

      const v1Measurements = await adapter.getMeasurements(v1Run.id);
      const v1OriginalCount = v1Measurements.length;
      expect(v1OriginalCount).toBeGreaterThan(0);

      // Perform corrections: delete 2 objects, add 1 object
      const deleteIds = [v1Measurements[0].id, v1Measurements[1].id];
      const newContour: Array<[number, number]> = [
        [50, 50],
        [80, 50],
        [80, 80],
        [50, 80],
      ];

      const v2Run = await adapter.saveCorrection({
        parentRunId: v1Run.id,
        deleteObjectIds: deleteIds,
        addObjects: [{ contour: newContour }],
        adjusted: [],
        changeNote: 'Deleted 2 false detections, added 1 missed nucleus',
      });

      // Verify v2 properties and version chain
      expect(v2Run.version).toBe(2);
      expect(v2Run.parentRunId).toBe(v1Run.id);
      expect(v2Run.kind).toBe('corrected');
      expect(v2Run.changeNote).toBe('Deleted 2 false detections, added 1 missed nucleus');
      expect(v2Run.objectCount).toBe(v1OriginalCount - 2 + 1);

      // CRITICAL CHECK: Verify parent v1 is completely untouched
      const v1After = await adapter.getAnalysis(v1Run.id);
      const v1MeasurementsAfter = await adapter.getMeasurements(v1Run.id);

      expect(v1After.version).toBe(1);
      expect(v1After.objectCount).toBe(v1OriginalCount);
      expect(v1MeasurementsAfter.length).toBe(v1OriginalCount);
      expect(v1MeasurementsAfter[0].id).toBe(v1Measurements[0].id);

      // Compare CSV exports of v1 vs v2
      const csvV1Blob = await adapter.exportCsv(v1Run.id);
      const csvV2Blob = await adapter.exportCsv(v2Run.id);

      const csvV1Text = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsText(csvV1Blob);
      });

      const csvV2Text = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsText(csvV2Blob);
      });

      // Headers + count
      expect(csvV1Text.split('\n').length).toBe(v1OriginalCount + 1);
      expect(csvV2Text.split('\n').length).toBe(v2Run.objectCount + 1);
      expect(csvV1Text).not.toBe(csvV2Text);
    });
  });
});
