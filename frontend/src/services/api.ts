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
} from '../types';
import { mockApi } from './mock';

export interface CellScopeApi {
  // auth
  register(p: { name: string; email: string; password: string; role: Role }): Promise<AuthResponse>;
  login(p: { email: string; password: string }): Promise<AuthResponse>;
  me(): Promise<User>;
  logout?(): Promise<void>;

  // experiments
  createExperiment(p: { title: string; description?: string; sampleReference?: string }): Promise<Experiment>;
  listExperiments(p?: { search?: string }): Promise<Experiment[]>; // reviewer: assigned only
  getExperiment(id: number): Promise<Experiment>;
  updateExperiment(id: number, p: Partial<Pick<Experiment, 'title' | 'description' | 'sampleReference'>>): Promise<Experiment>;
  deleteExperiment(id: number): Promise<void>;
  uploadImage(experimentId: number, file: File): Promise<ExperimentFile>;

  // analysis
  runAnalysis(p: { experimentId: number; fileId: number; parameters: AnalysisParameters }): Promise<AnalysisRun>;
  getAnalysis(id: number): Promise<AnalysisRun>;
  listRuns(experimentId: number): Promise<AnalysisRun[]>; // version history
  getMeasurements(runId: number): Promise<CellMeasurement[]>;
  getQuality(runId: number): Promise<QualityWarning[]>;
  assessQuality(p: { experimentId: number; fileId: number }): Promise<QualityWarning[]>; // pre-run
  saveCorrection(p: {
    parentRunId: number;
    deleteObjectIds: number[];
    addObjects: Array<Pick<CellMeasurement, 'contour'>>;
    adjusted: Array<{ objectId: number; contour: Array<[number, number]> }>;
    changeNote?: string;
  }): Promise<AnalysisRun>; // creates NEW version
  compareRuns(runIds: number[]): Promise<RunComparison>;
  exportCsv(runId: number): Promise<Blob>;
  exportAnnotatedImage(runId: number): Promise<Blob>;
  exportPdf(runId: number): Promise<Blob>;

  // reviews
  sendForReview(p: { runId: number; reviewerEmail: string }): Promise<ReviewAssignment>;
  listAssignedReviews(): Promise<Array<ReviewAssignment & { experiment: Experiment }>>;
  getReview(id: number): Promise<{ assignment: ReviewAssignment; comments: ReviewComment[]; annotations: ReviewAnnotation[] }>;
  addAnnotation(reviewId: number, p: Pick<ReviewAnnotation, 'objectId' | 'region' | 'suggestion'>): Promise<ReviewAnnotation>;
  addComment(reviewId: number, text: string): Promise<ReviewComment>;
  decide(reviewId: number, p: { decision: 'approved' | 'changes_requested'; comment?: string }): Promise<ReviewAssignment>;
  resolveAnnotation(annotationId: number, status: 'accepted' | 'rejected'): Promise<ReviewAnnotation>;

  // assistant (Gemini Guide)
  explain(p: { analysisId: number; question: string; language: 'en' | 'bn' }): Promise<{ answer: string; language: 'en' | 'bn' }>;
}

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

// Selected adapter: mock adapter in Phase 1; Axios adapter added in Phase 2
export const api: CellScopeApi = useMock
  ? mockApi
  : /* Axios adapter to be wired in Phase 2 */ mockApi;
