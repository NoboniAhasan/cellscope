import { describe, it, expect, beforeEach } from 'vitest';
import { MockAdapter } from '../../../services/mock';
import { mockStorage } from '../../../services/mock/storage';

describe('Milestone M5 — Comparison and Exports', () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    mockStorage.reset();
    adapter = new MockAdapter();
  });

  it('compares metrics across versions and experiments via compareRuns', async () => {
    await adapter.login({ email: 'researcher@cellscope.org', password: 'password123' });

    // 1. Experiment 1 - Automated Run v1
    const run1 = await adapter.runAnalysis({
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

    const m1 = await adapter.getMeasurements(run1.id);

    // 2. Experiment 1 - Corrected Run v2 (delete 2 items)
    const run2 = await adapter.saveCorrection({
      parentRunId: run1.id,
      deleteObjectIds: [m1[0].id, m1[1].id],
      addObjects: [],
      adjusted: [],
      changeNote: 'Refined false nuclei',
    });

    // 3. Compare v1 vs v2
    const comparison = await adapter.compareRuns([run1.id, run2.id]);
    expect(comparison.runs.length).toBe(2);

    const v1Comp = comparison.runs.find((r) => r.runId === run1.id);
    const v2Comp = comparison.runs.find((r) => r.runId === run2.id);

    expect(v1Comp).toBeDefined();
    expect(v2Comp).toBeDefined();
    expect(v1Comp!.objectCount).toBe(m1.length);
    expect(v2Comp!.objectCount).toBe(m1.length - 2);
    expect(v1Comp!.meanArea).toBeGreaterThan(0);
    expect(v1Comp!.meanCircularity).toBeGreaterThan(0);
  });

  it('exports annotated image blob with candidate objects and demo badge', async () => {
    await adapter.login({ email: 'researcher@cellscope.org', password: 'password123' });

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

    const imageBlob = await adapter.exportAnnotatedImage(run.id);
    expect(imageBlob).toBeDefined();
    expect(imageBlob.size).toBeGreaterThan(100);

    const imageText = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(imageBlob);
    });

    expect(imageText).toContain('DEMO RESULT');
    expect(imageText).toContain('<svg');
    expect(imageText).toContain('polygon');
  });

  it('exports PDF summary report with diagnosis notice, metrics and demo badge', async () => {
    await adapter.login({ email: 'researcher@cellscope.org', password: 'password123' });

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

    const pdfBlob = await adapter.exportPdf(run.id);
    expect(pdfBlob).toBeDefined();
    expect(pdfBlob.size).toBeGreaterThan(200);

    const pdfText = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(pdfBlob);
    });

    // Verify compliance and content
    expect(pdfText).toContain('DEMO RESULT');
    expect(pdfText).toContain('For educational/research use. Not for medical diagnosis.');
    expect(pdfText).toContain('CellScope Analysis Report');
    expect(pdfText).toContain(`Candidate Objects`);
  });
});
