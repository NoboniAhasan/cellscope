/**
 * Milestone M6 — Gemini Guide (Mocked) Tests
 *
 * Seeds data directly into mockStorage (bypassing API delays) to keep
 * tests fast. Only the `explain()` call itself goes through the adapter.
 *
 * Tests:
 * 1. English context-aware answer for detection question
 * 2. Bangla answer contains Bengali script characters
 * 3. Circularity question returns formula + "1.0" reference
 * 4. errorMode "timeout" throws "timed out"
 * 5. errorMode "quota" throws "Quota"
 * 6. errorMode "generic" throws "500"
 * 7. Error state does not break getMeasurements (page safety)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MockAdapter } from '../../../services/mock';
import { mockStorage } from '../../../services/mock/storage';
import type { AnalysisRun, CellMeasurement } from '../../../types';

// IDs that match the seeded initial data in mockStorage
const RESEARCHER_ID = 1;
const EXPERIMENT_ID = 1;
const FILE_ID = 101;
const RUN_ID = 999;

function seedRunAndMeasurements(): { run: AnalysisRun; measurements: CellMeasurement[] } {
  const run: AnalysisRun = {
    id: RUN_ID,
    experimentId: EXPERIMENT_ID,
    fileId: FILE_ID,
    version: 1,
    kind: 'automated',
    status: 'completed',
    parameters: {
      preset: 'fluorescence',
      polarity: 'bright_on_dark',
      blurSigma: 1.5,
      thresholdMethod: 'otsu',
      minArea: 100,
      maxArea: 5000,
    },
    algorithmVersion: 'mock-1.0',
    objectCount: 3,
    annotatedImageUrl: '',
    maskUrl: '',
    createdAt: new Date().toISOString(),
    createdBy: RESEARCHER_ID,
    isDemo: true,
  };

  const measurements: CellMeasurement[] = [
    {
      id: 1, runId: RUN_ID,
      area: 1200, perimeter: 120, circularity: 0.75,
      centroid: { x: 100, y: 100 },
      bbox: { x: 80, y: 80, width: 40, height: 40 },
      contour: [[80,80],[120,80],[120,120],[80,120]],
      source: 'automated',
    },
    {
      id: 2, runId: RUN_ID,
      area: 900, perimeter: 100, circularity: 0.80,
      centroid: { x: 200, y: 200 },
      bbox: { x: 180, y: 180, width: 40, height: 40 },
      contour: [[180,180],[220,180],[220,220],[180,220]],
      source: 'automated',
    },
    {
      id: 3, runId: RUN_ID,
      area: 1500, perimeter: 140, circularity: 0.70,
      centroid: { x: 300, y: 150 },
      bbox: { x: 280, y: 130, width: 40, height: 40 },
      contour: [[280,130],[320,130],[320,170],[280,170]],
      source: 'automated',
    },
  ];

  // Seed into storage without going through API (no delays)
  const runs = mockStorage.getRuns();
  runs.push(run);
  mockStorage.saveRuns(runs);

  const measurementsMap = mockStorage.getMeasurements();
  measurementsMap[RUN_ID] = measurements;
  mockStorage.saveMeasurements(measurementsMap);

  return { run, measurements };
}

beforeEach(() => {
  mockStorage.reset();
  // Set auth so adapter thinks researcher is logged in
  mockStorage.setAuth({ token: 'test-token', user: { id: RESEARCHER_ID, name: 'Dr. Elena Vance', email: 'researcher@cellscope.org', role: 'researcher', createdAt: new Date().toISOString() } });
});

describe('Milestone M6 — Gemini Guide (Mocked)', () => {
  it('English detection question returns context-aware answer with run data', async () => {
    seedRunAndMeasurements();
    const adapter = new MockAdapter();

    const result = await adapter.explain({
      analysisId: RUN_ID,
      question: 'Why were some objects not detected?',
      language: 'en',
    });

    expect(result.language).toBe('en');
    expect(result.answer.length).toBeGreaterThan(20);
    expect(result.answer).toMatch(/\d+/); // mentions a number (count or min-area)
    expect(result.answer.toLowerCase()).toMatch(/candidate|object|detected|filter|preset/);
  }, 5000);

  it('Bangla answer contains Bengali script characters', async () => {
    seedRunAndMeasurements();
    const adapter = new MockAdapter();

    const result = await adapter.explain({
      analysisId: RUN_ID,
      question: 'বৃত্তাকারতা বা Circularity কী?',
      language: 'bn',
    });

    expect(result.language).toBe('bn');
    expect(result.answer.length).toBeGreaterThan(10);
    // Bengali Unicode block U+0980–U+09FF
    expect(/[\u0980-\u09FF]/.test(result.answer)).toBe(true);
  }, 5000);

  it('Circularity question returns 4π formula and 1.0 reference', async () => {
    seedRunAndMeasurements();
    const adapter = new MockAdapter();

    const result = await adapter.explain({
      analysisId: RUN_ID,
      question: 'What does circularity mean?',
      language: 'en',
    });

    expect(result.language).toBe('en');
    expect(result.answer).toMatch(/4π|4.*π|area.*perimeter|perimeter.*area/i);
    expect(result.answer).toMatch(/1\.0/);
  }, 5000);

  it('errorMode "timeout" throws message containing "timed out"', async () => {
    seedRunAndMeasurements();
    const adapter = new MockAdapter();

    await expect(
      adapter.explain({ analysisId: RUN_ID, question: 'test', language: 'en', errorMode: 'timeout' })
    ).rejects.toMatchObject({ message: expect.stringContaining('timed out') });
  }, 5000);

  it('errorMode "quota" throws message containing "Quota"', async () => {
    seedRunAndMeasurements();
    const adapter = new MockAdapter();

    await expect(
      adapter.explain({ analysisId: RUN_ID, question: 'test', language: 'en', errorMode: 'quota' })
    ).rejects.toMatchObject({ message: expect.stringContaining('Quota') });
  }, 5000);

  it('errorMode "generic" throws message containing "500"', async () => {
    seedRunAndMeasurements();
    const adapter = new MockAdapter();

    await expect(
      adapter.explain({ analysisId: RUN_ID, question: 'test', language: 'en', errorMode: 'generic' })
    ).rejects.toMatchObject({ message: expect.stringContaining('500') });
  }, 5000);

  it('error in explain does not break getMeasurements (page safety)', async () => {
    const { measurements } = seedRunAndMeasurements();
    const adapter = new MockAdapter();

    // Simulate error
    await expect(
      adapter.explain({ analysisId: RUN_ID, question: 'test', language: 'en', errorMode: 'generic' })
    ).rejects.toThrow();

    // Core analysis still works
    const freshMeasurements = await adapter.getMeasurements(RUN_ID);
    expect(freshMeasurements.length).toBe(measurements.length);
    expect(freshMeasurements.length).toBeGreaterThan(0);
  }, 5000);
});
