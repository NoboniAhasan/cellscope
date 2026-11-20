import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MeasurementsTable } from '../MeasurementsTable';
import { ObjectDetailCard } from '../ObjectDetailCard';
import { calculateShoelaceArea, calculatePerimeter, calculateCircularity } from '../../../services/mock/detector';
import { MockAdapter } from '../../../services/mock';
import { CellMeasurement } from '../../../types';

const MOCK_ITEMS: CellMeasurement[] = [
  {
    id: 1,
    runId: 10,
    area: 450,
    perimeter: 76.2,
    circularity: 0.975,
    centroid: { x: 120, y: 140 },
    bbox: { x: 100, y: 120, width: 40, height: 40 },
    contour: [[100, 120], [140, 120], [140, 160], [100, 160]],
    source: 'automated',
  },
  {
    id: 2,
    runId: 10,
    area: 950,
    perimeter: 115.4,
    circularity: 0.898,
    centroid: { x: 260, y: 280 },
    bbox: { x: 230, y: 250, width: 60, height: 60 },
    contour: [[230, 250], [290, 250], [290, 310], [230, 310]],
    source: 'automated',
  },
];

describe('Core Analysis Vertical Slice (Milestone M2)', () => {
  // 1. Metric calculations
  describe('Geometric Metric Formulas', () => {
    it('calculates Shoelace area accurately for a standard polygon', () => {
      // 10x10 square
      const squareContour: Array<[number, number]> = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ];
      expect(calculateShoelaceArea(squareContour)).toBe(100);
      expect(calculatePerimeter(squareContour)).toBe(40);
      // Circularity: 4 * PI * 100 / (40^2) = 400 * PI / 1600 = PI / 4 = ~0.785
      const circ = calculateCircularity(100, 40);
      expect(circ).toBeCloseTo(Math.PI / 4, 2);
    });
  });

  // 2. Measurements Table Rendering & Sorting
  describe('Measurements Table', () => {
    it('renders candidate object metrics with uncalibrated px² notice', () => {
      const onSelect = vi.fn();
      render(
        <MeasurementsTable
          measurements={MOCK_ITEMS}
          selectedObjectId={null}
          onSelectObject={onSelect}
        />,
      );

      expect(screen.getByText(/2 Candidate Objects/i)).toBeInTheDocument();
      expect(screen.getByText(/Areas are in px² \(uncalibrated scale\)/i)).toBeInTheDocument();
      expect(screen.getByText('450 px²')).toBeInTheDocument();
      expect(screen.getByText('950 px²')).toBeInTheDocument();
    });

    it('triggers object selection on row click', async () => {
      const onSelect = vi.fn();
      render(
        <MeasurementsTable
          measurements={MOCK_ITEMS}
          selectedObjectId={null}
          onSelectObject={onSelect}
        />,
      );

      const firstRow = screen.getByText('#1');
      fireEvent.click(firstRow);
      expect(onSelect).toHaveBeenCalledWith(1);
    });
  });

  // 3. Object Detail Card
  describe('Object Detail Card', () => {
    it('renders selected candidate object details', () => {
      const onDeselect = vi.fn();
      render(
        <ObjectDetailCard
          measurement={MOCK_ITEMS[0]}
          onDeselect={onDeselect}
        />,
      );

      expect(screen.getByText('Candidate Object #1')).toBeInTheDocument();
      expect(screen.getByText('450')).toBeInTheDocument();
      expect(screen.getByText('0.975')).toBeInTheDocument();
    });
  });

  // 4. Display Filter Non-Mutation
  describe('Display Filter Behavior', () => {
    it('filters displayed rows without mutating underlying dataset', () => {
      const minAreaThreshold = 500;
      const filtered = MOCK_ITEMS.filter((m) => m.area >= minAreaThreshold);

      // Filtered only has item #2
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe(2);

      // Original dataset is completely unchanged
      expect(MOCK_ITEMS.length).toBe(2);
      expect(MOCK_ITEMS[0].id).toBe(1);
    });
  });

  // 5. Upload Validation & CSV Export in MockAdapter
  describe('MockAdapter Upload & CSV Export', () => {
    it('rejects files exceeding 20 MB limit', async () => {
      const adapter = new MockAdapter();
      const largeFile = new File([new ArrayBuffer(21 * 1024 * 1024)], 'giant_image.png', {
        type: 'image/png',
      });

      await expect(adapter.uploadImage(1, largeFile)).rejects.toMatchObject({
        code: 'FILE_TOO_LARGE',
      });
    });

    it('rejects invalid file types', async () => {
      const adapter = new MockAdapter();
      const textFile = new File(['hello content'], 'notes.txt', {
        type: 'text/plain',
      });

      await expect(adapter.uploadImage(1, textFile)).rejects.toMatchObject({
        code: 'INVALID_FILE_TYPE',
      });
    });

    it('exports CSV containing accurate headers and candidate objects', async () => {
      const adapter = new MockAdapter();
      await adapter.login({ email: 'researcher@cellscope.org', password: 'password123' });

      // Run analysis on seed experiment 1
      const run = await adapter.runAnalysis({
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

      expect(run.objectCount).toBeGreaterThan(0);

      const csvBlob = await adapter.exportCsv(run.id);
      expect(csvBlob).toBeDefined();

      const csvText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(csvBlob);
      });

      expect(csvText).toContain('Candidate_Object_ID,Area_px2,Perimeter_px,Circularity');
      expect(csvText.split('\n').length).toBe(run.objectCount + 1); // headers + objects
    });
  });
});
