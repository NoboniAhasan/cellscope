import {
  AnalysisParameters,
  AnalysisRun,
  ApiError,
  AuthResponse,
  CellMeasurement,
  Experiment,
  ExperimentFile,
  QualityWarning,
  ReviewAnnotation,
  ReviewAssignment,
  ReviewComment,
  Role,
  RunComparison,
  User,
} from '../../types';
import type { CellScopeApi } from '../api';
import { generateMockDetections } from './detector';
import { mockStorage, StoredUser } from './storage';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockAdapter implements CellScopeApi {
  // auth
  async register(p: { name: string; email: string; password: string; role: Role }): Promise<AuthResponse> {
    await delay(300);
    const users = mockStorage.getUsers();
    const normalizedEmail = p.email.trim().toLowerCase();

    const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      const err: ApiError = {
        status: 400,
        code: 'DUPLICATE_EMAIL',
        message: 'An account with this email address already exists.',
      };
      throw err;
    }

    const nextId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    const newUser: StoredUser = {
      id: nextId,
      name: p.name.trim(),
      email: normalizedEmail,
      role: p.role,
      passwordHash: p.password,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    mockStorage.saveUsers(users);

    const user: User = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };

    const authResponse: AuthResponse = {
      token: `mock-jwt-token-${newUser.id}-${Date.now()}`,
      user,
    };

    mockStorage.setAuth(authResponse);
    return authResponse;
  }

  async login(p: { email: string; password: string }): Promise<AuthResponse> {
    await delay(300);
    const users = mockStorage.getUsers();
    const normalizedEmail = p.email.trim().toLowerCase();

    const userRecord = users.find(
      (u) => u.email.toLowerCase() === normalizedEmail && u.passwordHash === p.password,
    );

    if (!userRecord) {
      const err: ApiError = {
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect email or password. Please try again.',
      };
      throw err;
    }

    const user: User = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
      createdAt: userRecord.createdAt,
    };

    const authResponse: AuthResponse = {
      token: `mock-jwt-token-${user.id}-${Date.now()}`,
      user,
    };

    mockStorage.setAuth(authResponse);
    return authResponse;
  }

  async me(): Promise<User> {
    await delay(50);
    const auth = mockStorage.getAuth();
    if (!auth) {
      const err: ApiError = {
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'No active session found.',
      };
      throw err;
    }
    return auth.user;
  }

  async logout(): Promise<void> {
    await delay(50);
    mockStorage.setAuth(null);
  }

  // experiments
  async createExperiment(p: { title: string; description?: string; sampleReference?: string }): Promise<Experiment> {
    await delay(200);
    const auth = mockStorage.getAuth();
    if (!auth) {
      const err: ApiError = { status: 401, code: 'UNAUTHORIZED', message: 'You must be logged in to create experiments.' };
      throw err;
    }

    if (!p.title || p.title.trim() === '') {
      const err: ApiError = { status: 400, code: 'VALIDATION_ERROR', message: 'Experiment title is required.' };
      throw err;
    }

    const experiments = mockStorage.getExperiments();
    const nextId = experiments.length > 0 ? Math.max(...experiments.map((e) => e.id)) + 1 : 1;
    const now = new Date().toISOString();

    const newExperiment: Experiment = {
      id: nextId,
      ownerId: auth.user.id,
      title: p.title.trim(),
      description: p.description?.trim() || undefined,
      sampleReference: p.sampleReference?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      files: [],
      isDemo: true,
    };

    experiments.unshift(newExperiment);
    mockStorage.saveExperiments(experiments);
    return newExperiment;
  }

  async listExperiments(p?: { search?: string }): Promise<Experiment[]> {
    await delay(150);
    const auth = mockStorage.getAuth();
    if (!auth) {
      const err: ApiError = { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required.' };
      throw err;
    }

    let experiments = mockStorage.getExperiments();

    if (auth.user.role === 'reviewer') {
      return [];
    }

    if (p?.search && p.search.trim() !== '') {
      const term = p.search.trim().toLowerCase();
      experiments = experiments.filter(
        (e) =>
          e.title.toLowerCase().includes(term) ||
          (e.sampleReference && e.sampleReference.toLowerCase().includes(term)) ||
          (e.description && e.description.toLowerCase().includes(term)),
      );
    }

    return [...experiments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getExperiment(id: number): Promise<Experiment> {
    await delay(150);
    const auth = mockStorage.getAuth();
    if (!auth) {
      const err: ApiError = { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required.' };
      throw err;
    }

    const experiments = mockStorage.getExperiments();
    const exp = experiments.find((e) => e.id === id);

    if (!exp) {
      const err: ApiError = { status: 404, code: 'NOT_FOUND', message: 'Experiment not found.' };
      throw err;
    }

    if (auth.user.role === 'reviewer') {
      const err: ApiError = {
        status: 403,
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this experiment.',
      };
      throw err;
    }

    return exp;
  }

  async updateExperiment(
    id: number,
    p: Partial<Pick<Experiment, 'title' | 'description' | 'sampleReference'>>,
  ): Promise<Experiment> {
    await delay(150);
    const experiments = mockStorage.getExperiments();
    const idx = experiments.findIndex((e) => e.id === id);
    if (idx === -1) {
      const err: ApiError = { status: 404, code: 'NOT_FOUND', message: 'Experiment not found.' };
      throw err;
    }

    const current = experiments[idx];
    const updated: Experiment = {
      ...current,
      title: p.title !== undefined ? p.title.trim() : current.title,
      description: p.description !== undefined ? p.description?.trim() : current.description,
      sampleReference: p.sampleReference !== undefined ? p.sampleReference?.trim() : current.sampleReference,
      updatedAt: new Date().toISOString(),
    };

    experiments[idx] = updated;
    mockStorage.saveExperiments(experiments);
    return updated;
  }

  async deleteExperiment(id: number): Promise<void> {
    await delay(150);
    const experiments = mockStorage.getExperiments();
    const filtered = experiments.filter((e) => e.id !== id);
    mockStorage.saveExperiments(filtered);
  }

  async uploadImage(experimentId: number, file: File): Promise<ExperimentFile> {
    await delay(350);
    const experiments = mockStorage.getExperiments();
    const exp = experiments.find((e) => e.id === experimentId);
    if (!exp) {
      const err: ApiError = { status: 404, code: 'NOT_FOUND', message: 'Experiment not found.' };
      throw err;
    }

    // Validate size (max 20 MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const err: ApiError = {
        status: 400,
        code: 'FILE_TOO_LARGE',
        message: 'Image exceeds the maximum allowable file size of 20 MB.',
      };
      throw err;
    }

    // Validate mime/extension
    const validExtensions = ['.png', '.jpg', '.jpeg', '.tif', '.tiff'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));
    const validMimes = ['image/png', 'image/jpeg', 'image/tiff'];
    const hasValidMime = validMimes.includes(file.type);

    if (!hasValidExt && !hasValidMime) {
      const err: ApiError = {
        status: 400,
        code: 'INVALID_FILE_TYPE',
        message: 'Unsupported format. Only PNG, JPEG, and TIFF microscopy images are accepted.',
      };
      throw err;
    }

    // Read file as data URL
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });

    // Obtain intrinsic dimensions
    const dimensions: { width: number; height: number } = await new Promise((resolve) => {
      if (typeof Image === 'undefined') {
        resolve({ width: 800, height: 600 });
        return;
      }
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
      img.onerror = () => resolve({ width: 800, height: 600 });
      img.src = dataUrl;
    });

    const allFiles = experiments.flatMap((e) => e.files);
    const nextFileId = allFiles.length > 0 ? Math.max(...allFiles.map((f) => f.id)) + 1 : 101;

    const newFile: ExperimentFile = {
      id: nextFileId,
      experimentId,
      filename: file.name,
      fileType: file.type || 'image/png',
      width: dimensions.width,
      height: dimensions.height,
      sizeBytes: file.size,
      originalUrl: dataUrl,
      uploadedAt: new Date().toISOString(),
    };

    exp.files.unshift(newFile);
    mockStorage.saveExperiments(experiments);
    mockStorage.saveImageData(nextFileId, dataUrl);
    return newFile;
  }

  // Pre-run quality assessment
  async assessQuality(p: { experimentId: number; fileId: number }): Promise<QualityWarning[]> {
    await delay(200);
    const experiments = mockStorage.getExperiments();
    const exp = experiments.find((e) => e.id === p.experimentId);
    const file = exp?.files.find((f) => f.id === p.fileId);

    const warnings: QualityWarning[] = [];
    if (!file) return warnings;

    // Check image dimensions
    if (file.width >= 4000 || file.height >= 4000) {
      warnings.push({
        code: 'VERY_LARGE_IMAGE',
        message: `High resolution scan (${file.width} × ${file.height} px).`,
        suggestion: 'Processing may take longer than usual. Standard Otsu watershed will be applied.',
        severity: 'info',
      });
    }

    // Informational notice on presets
    if (file.filename.toLowerCase().includes('fluor') || file.filename.toLowerCase().includes('dapi')) {
      warnings.push({
        code: 'LOW_CONTRAST',
        message: 'Dark background detected in specimen name/metadata.',
        suggestion: 'Verify that Polarity is set to "Bright on dark" for optimal nucleus detection.',
        severity: 'info',
      });
    }

    return warnings;
  }

  // analysis
  async runAnalysis(p: {
    experimentId: number;
    fileId: number;
    parameters: AnalysisParameters;
  }): Promise<AnalysisRun> {
    // Realistic simulation latency: 1500ms
    await delay(1500);

    const auth = mockStorage.getAuth();
    if (!auth) {
      const err: ApiError = { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required.' };
      throw err;
    }

    const experiments = mockStorage.getExperiments();
    const exp = experiments.find((e) => e.id === p.experimentId);
    if (!exp) {
      const err: ApiError = { status: 404, code: 'NOT_FOUND', message: 'Experiment not found.' };
      throw err;
    }

    const file = exp.files.find((f) => f.id === p.fileId);
    if (!file) {
      const err: ApiError = { status: 404, code: 'NOT_FOUND', message: 'Target image file not found.' };
      throw err;
    }

    const runs = mockStorage.getRuns();
    const nextRunId = runs.length > 0 ? Math.max(...runs.map((r) => r.id)) + 1 : 1;

    // Generate mock candidate detections & metrics
    const { measurements, warnings, maskDataUrl } = generateMockDetections(
      file.width,
      file.height,
      p.parameters,
      nextRunId,
    );

    const newRun: AnalysisRun = {
      id: nextRunId,
      experimentId: p.experimentId,
      fileId: p.fileId,
      version: 1,
      kind: 'automated',
      status: 'completed',
      parameters: p.parameters,
      algorithmVersion: 'cellscope-otsu-watershed-v1',
      objectCount: measurements.length,
      annotatedImageUrl: file.originalUrl,
      maskUrl: maskDataUrl,
      createdAt: new Date().toISOString(),
      createdBy: auth.user.id,
      isDemo: true, // Always true for mock results per honesty rules
    };

    runs.unshift(newRun);
    mockStorage.saveRuns(runs);

    // Persist measurements and quality warnings
    const measurementsMap = mockStorage.getMeasurements();
    measurementsMap[nextRunId] = measurements;
    mockStorage.saveMeasurements(measurementsMap);

    const qualityMap = mockStorage.getQualityWarnings();
    qualityMap[nextRunId] = warnings;
    mockStorage.saveQualityWarnings(qualityMap);

    // Update experiment latestRunId
    exp.latestRunId = nextRunId;
    mockStorage.saveExperiments(experiments);

    return newRun;
  }

  async getAnalysis(id: number): Promise<AnalysisRun> {
    await delay(150);
    const runs = mockStorage.getRuns();
    const run = runs.find((r) => r.id === id);
    if (!run) {
      const err: ApiError = { status: 404, code: 'NOT_FOUND', message: 'Analysis run not found.' };
      throw err;
    }
    return run;
  }

  async listRuns(experimentId: number): Promise<AnalysisRun[]> {
    await delay(150);
    const runs = mockStorage.getRuns();
    return runs
      .filter((r) => r.experimentId === experimentId)
      .sort((a, b) => b.version - a.version);
  }

  async getMeasurements(runId: number): Promise<CellMeasurement[]> {
    await delay(150);
    const measurementsMap = mockStorage.getMeasurements();
    return measurementsMap[runId] || [];
  }

  async getQuality(runId: number): Promise<QualityWarning[]> {
    await delay(150);
    const qualityMap = mockStorage.getQualityWarnings();
    return qualityMap[runId] || [];
  }

  async exportCsv(runId: number): Promise<Blob> {
    await delay(200);
    const measurementsMap = mockStorage.getMeasurements();
    const items = measurementsMap[runId] || [];

    const headers = [
      'Candidate_Object_ID',
      'Area_px2',
      'Perimeter_px',
      'Circularity',
      'Centroid_X',
      'Centroid_Y',
      'BBox_X',
      'BBox_Y',
      'BBox_Width',
      'BBox_Height',
      'Source',
    ];

    const rows = items.map((m) => [
      m.id,
      m.area,
      m.perimeter,
      m.circularity,
      m.centroid.x,
      m.centroid.y,
      m.bbox.x,
      m.bbox.y,
      m.bbox.width,
      m.bbox.height,
      m.source,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  async exportAnnotatedImage(_runId: number): Promise<Blob> {
    throw new Error('MockAdapter: exportAnnotatedImage scheduled for Milestone M5');
  }

  async exportPdf(_runId: number): Promise<Blob> {
    throw new Error('MockAdapter: exportPdf scheduled for Milestone M5');
  }

  async saveCorrection(_p: {
    parentRunId: number;
    deleteObjectIds: number[];
    addObjects: Array<Pick<CellMeasurement, 'contour'>>;
    adjusted: Array<{ objectId: number; contour: Array<[number, number]> }>;
    changeNote?: string;
  }): Promise<AnalysisRun> {
    throw new Error('MockAdapter: saveCorrection scheduled for Milestone M3');
  }

  async compareRuns(_runIds: number[]): Promise<RunComparison> {
    throw new Error('MockAdapter: compareRuns scheduled for Milestone M5');
  }

  // reviews
  async sendForReview(_p: { runId: number; reviewerEmail: string }): Promise<ReviewAssignment> {
    throw new Error('MockAdapter: sendForReview scheduled for Milestone M4');
  }

  async listAssignedReviews(): Promise<Array<ReviewAssignment & { experiment: Experiment }>> {
    return [];
  }

  async getReview(
    _id: number,
  ): Promise<{ assignment: ReviewAssignment; comments: ReviewComment[]; annotations: ReviewAnnotation[] }> {
    throw new Error('MockAdapter: getReview scheduled for Milestone M4');
  }

  async addAnnotation(
    _reviewId: number,
    _p: Pick<ReviewAnnotation, 'objectId' | 'region' | 'suggestion'>,
  ): Promise<ReviewAnnotation> {
    throw new Error('MockAdapter: addAnnotation scheduled for Milestone M4');
  }

  async addComment(_reviewId: number, _text: string): Promise<ReviewComment> {
    throw new Error('MockAdapter: addComment not implemented yet');
  }

  async decide(
    _reviewId: number,
    _p: { decision: 'approved' | 'changes_requested'; comment?: string },
  ): Promise<ReviewAssignment> {
    throw new Error('MockAdapter: decide scheduled for Milestone M4');
  }

  async resolveAnnotation(
    _annotationId: number,
    _status: 'accepted' | 'rejected',
  ): Promise<ReviewAnnotation> {
    throw new Error('MockAdapter: resolveAnnotation scheduled for Milestone M4');
  }

  // assistant (Gemini Guide)
  async explain(_p: {
    analysisId: number;
    question: string;
    language: 'en' | 'bn';
  }): Promise<{ answer: string; language: 'en' | 'bn' }> {
    throw new Error('MockAdapter: explain scheduled for Milestone M6');
  }
}

export const mockApi = new MockAdapter();
