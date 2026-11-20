# CellScope API Contract (frontend ⇄ backend)

This is the single source of truth for data shapes. Phase 1 implements it with a mock
adapter. Phase 2 implements it in FastAPI (Pydantic schemas should mirror these types).
Base path: `/api/v1`. All protected routes need `Authorization: Bearer <token>`.

## 1. Types (put in `frontend/src/types/`)

```ts
export type Role = "researcher" | "reviewer";
export type Polarity = "bright_on_dark" | "dark_on_bright";
export type PresetId = "fluorescence" | "dark_stained" | "low_contrast";
export type RunStatus = "pending" | "running" | "completed" | "failed";
export type ReviewStatus = "pending" | "approved" | "changes_requested";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string; // ISO
}

export interface AuthResponse { token: string; user: User; }

export interface Experiment {
  id: number;
  ownerId: number;
  title: string;
  description?: string;
  sampleReference?: string;
  createdAt: string;
  updatedAt: string;
  files: ExperimentFile[];
  latestRunId?: number;
  reviewStatus?: ReviewStatus;
  isDemo: boolean;               // true for mock/sample data
}

export interface ExperimentFile {
  id: number;
  experimentId: number;
  filename: string;
  fileType: string;              // image/png, image/jpeg, image/tiff
  width: number;
  height: number;
  sizeBytes: number;
  originalUrl: string;           // image reference
  uploadedAt: string;
}

export interface AnalysisParameters {
  preset: PresetId;
  polarity: Polarity;
  blurSigma: number;
  thresholdMethod: "otsu";
  minArea: number;
  maxArea: number;
}

export interface AnalysisRun {
  id: number;
  experimentId: number;
  fileId: number;
  version: number;               // 1 = automated, 2+ = corrected
  parentRunId?: number;          // version chain, never overwritten
  kind: "automated" | "corrected";
  status: RunStatus;
  parameters: AnalysisParameters;
  algorithmVersion: string;
  objectCount: number;
  annotatedImageUrl: string;
  maskUrl: string;
  createdAt: string;
  createdBy: number;
  changeNote?: string;           // e.g. "Deleted 3 false detections"
  isDemo: boolean;
}

export interface CellMeasurement {
  id: number;                    // object id within the run
  runId: number;
  area: number;                  // px²
  perimeter: number;             // px
  circularity: number;           // 4πA/P²
  centroid: { x: number; y: number };
  bbox: { x: number; y: number; width: number; height: number };
  contour: Array<[number, number]>; // polygon points for drawing/selecting
  source: "automated" | "added" | "adjusted";
}

export type WarningCode =
  | "LOW_CONTRAST" | "NO_OBJECTS" | "TOO_MANY_TINY_OBJECTS"
  | "EXCESSIVE_BLUR" | "VERY_LARGE_IMAGE" | "POSSIBLE_INCOMPLETE_SEGMENTATION";

export interface QualityWarning {
  code: WarningCode;
  message: string;
  suggestion: string;
  severity: "info" | "warning";
}

export interface ReviewAssignment {
  id: number;
  experimentId: number;
  runId: number;
  researcherId: number;
  reviewerId: number;
  status: ReviewStatus;
  assignedAt: string;
}

export interface ReviewComment {
  id: number; reviewId: number; authorId: number; authorName: string;
  text: string; createdAt: string;
}

export interface ReviewAnnotation {
  id: number; reviewId: number; objectId?: number;
  region?: { x: number; y: number; width: number; height: number };
  suggestion: string;
  status: "open" | "accepted" | "rejected";
  authorId: number; createdAt: string;
}

export interface ApiError { status: number; code: string; message: string; }
```

## 2. Service interface (`services/api.ts`)

Every function returns a Promise. The mock adapter and the future Axios adapter both
implement this interface.

```ts
export interface CellScopeApi {
  // auth
  register(p: { name: string; email: string; password: string; role: Role }): Promise<AuthResponse>;
  login(p: { email: string; password: string }): Promise<AuthResponse>;
  me(): Promise<User>;

  // experiments
  createExperiment(p: { title: string; description?: string; sampleReference?: string }): Promise<Experiment>;
  listExperiments(p?: { search?: string }): Promise<Experiment[]>;   // reviewer: assigned only
  getExperiment(id: number): Promise<Experiment>;
  updateExperiment(id: number, p: Partial<Pick<Experiment, "title"|"description"|"sampleReference">>): Promise<Experiment>;
  deleteExperiment(id: number): Promise<void>;
  uploadImage(experimentId: number, file: File): Promise<ExperimentFile>;

  // analysis
  runAnalysis(p: { experimentId: number; fileId: number; parameters: AnalysisParameters }): Promise<AnalysisRun>;
  getAnalysis(id: number): Promise<AnalysisRun>;
  listRuns(experimentId: number): Promise<AnalysisRun[]>;            // version history
  getMeasurements(runId: number): Promise<CellMeasurement[]>;
  getQuality(runId: number): Promise<QualityWarning[]>;
  assessQuality(p: { experimentId: number; fileId: number }): Promise<QualityWarning[]>; // pre-run
  saveCorrection(p: {
    parentRunId: number;
    deleteObjectIds: number[];
    addObjects: Array<Pick<CellMeasurement, "contour">>;
    adjusted: Array<{ objectId: number; contour: Array<[number, number]> }>;
    changeNote?: string;
  }): Promise<AnalysisRun>;                                          // creates NEW version
  compareRuns(runIds: number[]): Promise<RunComparison>;
  exportCsv(runId: number): Promise<Blob>;
  exportAnnotatedImage(runId: number): Promise<Blob>;
  exportPdf(runId: number): Promise<Blob>;

  // reviews
  sendForReview(p: { runId: number; reviewerEmail: string }): Promise<ReviewAssignment>;
  listAssignedReviews(): Promise<Array<ReviewAssignment & { experiment: Experiment }>>;
  getReview(id: number): Promise<{ assignment: ReviewAssignment; comments: ReviewComment[]; annotations: ReviewAnnotation[] }>;
  addAnnotation(reviewId: number, p: Pick<ReviewAnnotation, "objectId"|"region"|"suggestion">): Promise<ReviewAnnotation>;
  addComment(reviewId: number, text: string): Promise<ReviewComment>;
  decide(reviewId: number, p: { decision: "approved" | "changes_requested"; comment?: string }): Promise<ReviewAssignment>;
  resolveAnnotation(annotationId: number, status: "accepted" | "rejected"): Promise<ReviewAnnotation>;

  // assistant (Gemini Guide)
  explain(p: { analysisId: number; question: string; language: "en" | "bn" }): Promise<{ answer: string; language: "en" | "bn" }>;
}

export interface RunComparison {
  runs: Array<{
    runId: number; label: string; objectCount: number;
    meanArea: number; meanPerimeter: number; meanCircularity: number;
  }>;
}
```

## 3. Mapping to REST routes (Phase 2)

| Function | Route |
|---|---|
| register / login / me | POST /auth/register, POST /auth/login, GET /auth/me |
| create/list/get/update/delete experiment | POST/GET /experiments, GET/PATCH/DELETE /experiments/{id} |
| uploadImage | POST /experiments/{id}/images (multipart) |
| runAnalysis | POST /analysis/run |
| getAnalysis / getMeasurements / getQuality | GET /analysis/{id}, /measurements, /quality |
| saveCorrection | POST /analysis/{id}/corrections (extra route: creates new version) |
| compareRuns | POST /analysis/compare |
| exportCsv / exportPdf | GET /analysis/{id}/export/csv, GET /analysis/{id}/report/pdf |
| sendForReview | POST /analysis/{id}/review |
| listAssignedReviews | GET /reviews/assigned |
| addAnnotation / addComment / decide | POST /reviews/{id}/annotations, /comments, /decision |
| explain | POST /assistant/explain |

Extra routes (listRuns, assessQuality, getReview, resolveAnnotation, image/mask download)
are additions to the doc's list; the doc allows additional routes for correction, downloads,
and sample data.

## 4. Mock-adapter behaviour requirements

- Latency: simulate 300–900 ms; analysis 1.5–3 s with a progress state.
- Errors: reject unsupported types, files > 20 MB, and corrupt images with clear `ApiError`s.
- Persistence: survives page reload. Provide `resetDemoData()` and `loadSampleData()`.
- Mock detections: generate N plausible contours (ellipse-like polygons) inside the image
  bounds, respecting polarity/preset/minArea so changing settings visibly changes results.
  Compute area (shoelace), perimeter, circularity, centroid and bbox FROM the contour,
  using the same formulas the backend will use (C = 4πA/P²).
- Corrections must create a new run (version+1) with `parentRunId` set; the parent run and
  its measurements stay untouched.
- Quality warnings: derive from simple real image stats where cheap (canvas-based mean/contrast,
  dimensions, object count) so warnings react to the actual uploaded image.
- Reviewer access: `listExperiments` for a reviewer returns only assigned experiments;
  `getExperiment` on an unassigned one rejects with 403.
- Gemini mock: canned, context-aware answers in English and Bangla using the run's real
  count/warnings/preset; include a toggle to simulate timeout/quota error.
- Every mock-produced run/experiment has `isDemo: true`.
