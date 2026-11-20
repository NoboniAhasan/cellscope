import {
  AnalysisParameters,
  AnalysisRun,
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

export class MockAdapter implements CellScopeApi {
  // auth
  async register(_p: { name: string; email: string; password: string; role: Role }): Promise<AuthResponse> {
    throw new Error('MockAdapter: register not implemented yet');
  }

  async login(_p: { email: string; password: string }): Promise<AuthResponse> {
    throw new Error('MockAdapter: login not implemented yet');
  }

  async me(): Promise<User> {
    throw new Error('MockAdapter: me not implemented yet');
  }

  // experiments
  async createExperiment(_p: { title: string; description?: string; sampleReference?: string }): Promise<Experiment> {
    throw new Error('MockAdapter: createExperiment not implemented yet');
  }

  async listExperiments(_p?: { search?: string }): Promise<Experiment[]> {
    throw new Error('MockAdapter: listExperiments not implemented yet');
  }

  async getExperiment(_id: number): Promise<Experiment> {
    throw new Error('MockAdapter: getExperiment not implemented yet');
  }

  async updateExperiment(
    _id: number,
    _p: Partial<Pick<Experiment, 'title' | 'description' | 'sampleReference'>>,
  ): Promise<Experiment> {
    throw new Error('MockAdapter: updateExperiment not implemented yet');
  }

  async deleteExperiment(_id: number): Promise<void> {
    throw new Error('MockAdapter: deleteExperiment not implemented yet');
  }

  async uploadImage(_experimentId: number, _file: File): Promise<ExperimentFile> {
    throw new Error('MockAdapter: uploadImage not implemented yet');
  }

  // analysis
  async runAnalysis(_p: {
    experimentId: number;
    fileId: number;
    parameters: AnalysisParameters;
  }): Promise<AnalysisRun> {
    throw new Error('MockAdapter: runAnalysis not implemented yet');
  }

  async getAnalysis(_id: number): Promise<AnalysisRun> {
    throw new Error('MockAdapter: getAnalysis not implemented yet');
  }

  async listRuns(_experimentId: number): Promise<AnalysisRun[]> {
    throw new Error('MockAdapter: listRuns not implemented yet');
  }

  async getMeasurements(_runId: number): Promise<CellMeasurement[]> {
    throw new Error('MockAdapter: getMeasurements not implemented yet');
  }

  async getQuality(_runId: number): Promise<QualityWarning[]> {
    throw new Error('MockAdapter: getQuality not implemented yet');
  }

  async assessQuality(_p: { experimentId: number; fileId: number }): Promise<QualityWarning[]> {
    throw new Error('MockAdapter: assessQuality not implemented yet');
  }

  async saveCorrection(_p: {
    parentRunId: number;
    deleteObjectIds: number[];
    addObjects: Array<Pick<CellMeasurement, 'contour'>>;
    adjusted: Array<{ objectId: number; contour: Array<[number, number]> }>;
    changeNote?: string;
  }): Promise<AnalysisRun> {
    throw new Error('MockAdapter: saveCorrection not implemented yet');
  }

  async compareRuns(_runIds: number[]): Promise<RunComparison> {
    throw new Error('MockAdapter: compareRuns not implemented yet');
  }

  async exportCsv(_runId: number): Promise<Blob> {
    throw new Error('MockAdapter: exportCsv not implemented yet');
  }

  async exportAnnotatedImage(_runId: number): Promise<Blob> {
    throw new Error('MockAdapter: exportAnnotatedImage not implemented yet');
  }

  async exportPdf(_runId: number): Promise<Blob> {
    throw new Error('MockAdapter: exportPdf not implemented yet');
  }

  // reviews
  async sendForReview(_p: { runId: number; reviewerEmail: string }): Promise<ReviewAssignment> {
    throw new Error('MockAdapter: sendForReview not implemented yet');
  }

  async listAssignedReviews(): Promise<Array<ReviewAssignment & { experiment: Experiment }>> {
    throw new Error('MockAdapter: listAssignedReviews not implemented yet');
  }

  async getReview(
    _id: number,
  ): Promise<{ assignment: ReviewAssignment; comments: ReviewComment[]; annotations: ReviewAnnotation[] }> {
    throw new Error('MockAdapter: getReview not implemented yet');
  }

  async addAnnotation(
    _reviewId: number,
    _p: Pick<ReviewAnnotation, 'objectId' | 'region' | 'suggestion'>,
  ): Promise<ReviewAnnotation> {
    throw new Error('MockAdapter: addAnnotation not implemented yet');
  }

  async addComment(_reviewId: number, _text: string): Promise<ReviewComment> {
    throw new Error('MockAdapter: addComment not implemented yet');
  }

  async decide(
    _reviewId: number,
    _p: { decision: 'approved' | 'changes_requested'; comment?: string },
  ): Promise<ReviewAssignment> {
    throw new Error('MockAdapter: decide not implemented yet');
  }

  async resolveAnnotation(
    _annotationId: number,
    _status: 'accepted' | 'rejected',
  ): Promise<ReviewAnnotation> {
    throw new Error('MockAdapter: resolveAnnotation not implemented yet');
  }

  // assistant (Gemini Guide)
  async explain(_p: {
    analysisId: number;
    question: string;
    language: 'en' | 'bn';
  }): Promise<{ answer: string; language: 'en' | 'bn' }> {
    throw new Error('MockAdapter: explain not implemented yet');
  }
}

export const mockApi = new MockAdapter();
