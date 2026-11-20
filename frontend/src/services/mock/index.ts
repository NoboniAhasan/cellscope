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
import { mockStorage, StoredUser } from './storage';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockAdapter implements CellScopeApi {
  // auth
  async register(p: { name: string; email: string; password: string; role: Role }): Promise<AuthResponse> {
    await delay(350);
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
    await delay(350);
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
    await delay(100);
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
    await delay(100);
    mockStorage.setAuth(null);
  }

  // experiments
  async createExperiment(p: { title: string; description?: string; sampleReference?: string }): Promise<Experiment> {
    await delay(300);
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
      isDemo: true, // Always true for mock/sample data per AGENTS.md
    };

    experiments.unshift(newExperiment);
    mockStorage.saveExperiments(experiments);
    return newExperiment;
  }

  async listExperiments(p?: { search?: string }): Promise<Experiment[]> {
    await delay(250);
    const auth = mockStorage.getAuth();
    if (!auth) {
      const err: ApiError = { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required.' };
      throw err;
    }

    let experiments = mockStorage.getExperiments();

    // Reviewer role rule: reviewers only see experiments assigned to them
    if (auth.user.role === 'reviewer') {
      // Review assignments are wired in M4; currently empty for reviewers
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

    // Return newest first
    return [...experiments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getExperiment(id: number): Promise<Experiment> {
    await delay(200);
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
      // Reviewer access check per spec: unassigned access rejects with 403
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
    await delay(250);
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
    await delay(250);
    const experiments = mockStorage.getExperiments();
    const filtered = experiments.filter((e) => e.id !== id);
    mockStorage.saveExperiments(filtered);
  }

  async uploadImage(_experimentId: number, _file: File): Promise<ExperimentFile> {
    throw new Error('MockAdapter: uploadImage scheduled for Milestone M2');
  }

  // analysis
  async runAnalysis(_p: {
    experimentId: number;
    fileId: number;
    parameters: AnalysisParameters;
  }): Promise<AnalysisRun> {
    throw new Error('MockAdapter: runAnalysis scheduled for Milestone M2');
  }

  async getAnalysis(_id: number): Promise<AnalysisRun> {
    throw new Error('MockAdapter: getAnalysis scheduled for Milestone M2');
  }

  async listRuns(_experimentId: number): Promise<AnalysisRun[]> {
    throw new Error('MockAdapter: listRuns scheduled for Milestone M2/M3');
  }

  async getMeasurements(_runId: number): Promise<CellMeasurement[]> {
    throw new Error('MockAdapter: getMeasurements scheduled for Milestone M2');
  }

  async getQuality(_runId: number): Promise<QualityWarning[]> {
    throw new Error('MockAdapter: getQuality scheduled for Milestone M2');
  }

  async assessQuality(_p: { experimentId: number; fileId: number }): Promise<QualityWarning[]> {
    throw new Error('MockAdapter: assessQuality scheduled for Milestone M2');
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

  async exportCsv(_runId: number): Promise<Blob> {
    throw new Error('MockAdapter: exportCsv scheduled for Milestone M2');
  }

  async exportAnnotatedImage(_runId: number): Promise<Blob> {
    throw new Error('MockAdapter: exportAnnotatedImage scheduled for Milestone M5');
  }

  async exportPdf(_runId: number): Promise<Blob> {
    throw new Error('MockAdapter: exportPdf scheduled for Milestone M5');
  }

  // reviews
  async sendForReview(_p: { runId: number; reviewerEmail: string }): Promise<ReviewAssignment> {
    throw new Error('MockAdapter: sendForReview scheduled for Milestone M4');
  }

  async listAssignedReviews(): Promise<Array<ReviewAssignment & { experiment: Experiment }>> {
    return []; // Empty until assignments created in M4
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
