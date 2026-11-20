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

export interface AuthResponse {
  token: string;
  user: User;
}

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
  | "LOW_CONTRAST"
  | "NO_OBJECTS"
  | "TOO_MANY_TINY_OBJECTS"
  | "EXCESSIVE_BLUR"
  | "VERY_LARGE_IMAGE"
  | "POSSIBLE_INCOMPLETE_SEGMENTATION";

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
  id: number;
  reviewId: number;
  authorId: number;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface ReviewAnnotation {
  id: number;
  reviewId: number;
  objectId?: number;
  region?: { x: number; y: number; width: number; height: number };
  suggestion: string;
  status: "open" | "accepted" | "rejected";
  authorId: number;
  createdAt: string;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
}

export interface RunComparison {
  runs: Array<{
    runId: number;
    label: string;
    objectCount: number;
    meanArea: number;
    meanPerimeter: number;
    meanCircularity: number;
  }>;
}
