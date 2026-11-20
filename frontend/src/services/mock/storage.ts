import {
  AnalysisRun,
  CellMeasurement,
  Experiment,
  QualityWarning,
  ReviewAnnotation,
  ReviewAssignment,
  ReviewComment,
  Role,
  User,
} from '../../types';

export interface StoredUser extends User {
  passwordHash: string;
}

const STORAGE_KEY_USERS = 'cellscope_users';
const STORAGE_KEY_AUTH = 'cellscope_auth_user';
const STORAGE_KEY_EXPERIMENTS = 'cellscope_experiments';
const STORAGE_KEY_RUNS = 'cellscope_runs';
const STORAGE_KEY_MEASUREMENTS = 'cellscope_measurements';
const STORAGE_KEY_QUALITY = 'cellscope_quality_warnings';
const STORAGE_KEY_IMAGE_DATA = 'cellscope_image_data';
const STORAGE_KEY_REVIEWS = 'cellscope_reviews';
const STORAGE_KEY_REVIEW_COMMENTS = 'cellscope_review_comments';
const STORAGE_KEY_REVIEW_ANNOTATIONS = 'cellscope_review_annotations';

export const SAMPLE_FLUORESCENCE_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450"><rect width="600" height="450" fill="%23050914"/><circle cx="150" cy="120" r="32" fill="%2338bdf8" filter="blur(3px)" opacity="0.9"/><circle cx="150" cy="120" r="22" fill="%23e0f2fe"/><circle cx="360" cy="180" r="40" fill="%230ea5e9" filter="blur(4px)" opacity="0.85"/><circle cx="360" cy="180" r="26" fill="%23ffffff"/><circle cx="230" cy="310" r="35" fill="%230284c7" filter="blur(3px)" opacity="0.9"/><circle cx="230" cy="310" r="20" fill="%23bae6fd"/><circle cx="470" cy="280" r="28" fill="%2338bdf8" filter="blur(2px)" opacity="0.85"/><circle cx="470" cy="280" r="18" fill="%23e0f2fe"/><circle cx="80" cy="250" r="24" fill="%230284c7" filter="blur(3px)" opacity="0.8"/><circle cx="80" cy="250" r="15" fill="%23bae6fd"/><text x="15" y="435" fill="%2394a3b8" font-family="sans-serif" font-size="12">CellScope Sample: DAPI Fluorescence Stain (600x450)</text></svg>';

const INITIAL_USERS: StoredUser[] = [
  {
    id: 1,
    name: 'Dr. Elena Vance',
    email: 'researcher@cellscope.org',
    role: 'researcher' as Role,
    passwordHash: 'password123',
    createdAt: new Date('2026-11-01T08:00:00Z').toISOString(),
  },
  {
    id: 2,
    name: 'Dr. Marcus Reed',
    email: 'reviewer@cellscope.org',
    role: 'reviewer' as Role,
    passwordHash: 'password123',
    createdAt: new Date('2026-11-02T09:00:00Z').toISOString(),
  },
];

const INITIAL_EXPERIMENTS: Experiment[] = [
  {
    id: 1,
    ownerId: 1,
    title: 'Fluorescence Assay - HeLa Culture',
    sampleReference: 'HELA-2026-04A',
    description: 'Primary baseline scan of HeLa nuclear morphology under DAPI fluorescence.',
    isDemo: true,
    files: [
      {
        id: 101,
        experimentId: 1,
        filename: 'hela_dapi_sample.png',
        fileType: 'image/png',
        width: 600,
        height: 450,
        sizeBytes: 184500,
        originalUrl: SAMPLE_FLUORESCENCE_IMAGE,
        uploadedAt: new Date('2026-11-18T10:05:00Z').toISOString(),
      },
    ],
    createdAt: new Date('2026-11-18T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-11-18T10:00:00Z').toISOString(),
  },
  {
    id: 2,
    ownerId: 1,
    title: 'Yeast Culture Count - Sample B',
    sampleReference: 'SAC-091B',
    description: 'Brightfield microscopy imaging of budding yeast cultures.',
    isDemo: true,
    files: [],
    createdAt: new Date('2026-11-19T14:30:00Z').toISOString(),
    updatedAt: new Date('2026-11-19T14:30:00Z').toISOString(),
  },
];

const memoryFallback: Record<string, string> = {};

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memoryFallback[key] ?? null;
  }
}

function safeSet(key: string, val: string): void {
  try {
    localStorage.setItem(key, val);
  } catch {
    memoryFallback[key] = val;
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    delete memoryFallback[key];
  }
}

export const mockStorage = {
  getUsers(): StoredUser[] {
    const raw = safeGet(STORAGE_KEY_USERS);
    if (!raw) {
      safeSet(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users: StoredUser[]): void {
    safeSet(STORAGE_KEY_USERS, JSON.stringify(users));
  },

  getAuth(): { token: string; user: User } | null {
    const raw = safeGet(STORAGE_KEY_AUTH);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setAuth(auth: { token: string; user: User } | null): void {
    if (auth) {
      safeSet(STORAGE_KEY_AUTH, JSON.stringify(auth));
    } else {
      safeRemove(STORAGE_KEY_AUTH);
    }
  },

  getExperiments(): Experiment[] {
    const raw = safeGet(STORAGE_KEY_EXPERIMENTS);
    if (!raw) {
      safeSet(STORAGE_KEY_EXPERIMENTS, JSON.stringify(INITIAL_EXPERIMENTS));
      return INITIAL_EXPERIMENTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_EXPERIMENTS;
    }
  },

  saveExperiments(experiments: Experiment[]): void {
    safeSet(STORAGE_KEY_EXPERIMENTS, JSON.stringify(experiments));
  },

  getRuns(): AnalysisRun[] {
    const raw = safeGet(STORAGE_KEY_RUNS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveRuns(runs: AnalysisRun[]): void {
    safeSet(STORAGE_KEY_RUNS, JSON.stringify(runs));
  },

  getMeasurements(): Record<number, CellMeasurement[]> {
    const raw = safeGet(STORAGE_KEY_MEASUREMENTS);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  saveMeasurements(map: Record<number, CellMeasurement[]>): void {
    safeSet(STORAGE_KEY_MEASUREMENTS, JSON.stringify(map));
  },

  getQualityWarnings(): Record<number, QualityWarning[]> {
    const raw = safeGet(STORAGE_KEY_QUALITY);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  saveQualityWarnings(map: Record<number, QualityWarning[]>): void {
    safeSet(STORAGE_KEY_QUALITY, JSON.stringify(map));
  },

  getImageDataMap(): Record<number, string> {
    const raw = safeGet(STORAGE_KEY_IMAGE_DATA);
    if (!raw) return { 101: SAMPLE_FLUORESCENCE_IMAGE };
    try {
      return JSON.parse(raw);
    } catch {
      return { 101: SAMPLE_FLUORESCENCE_IMAGE };
    }
  },

  saveImageData(fileId: number, dataUrl: string): void {
    const map = this.getImageDataMap();
    map[fileId] = dataUrl;
    safeSet(STORAGE_KEY_IMAGE_DATA, JSON.stringify(map));
  },

  // Review System Storage
  getReviews(): ReviewAssignment[] {
    const raw = safeGet(STORAGE_KEY_REVIEWS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveReviews(reviews: ReviewAssignment[]): void {
    safeSet(STORAGE_KEY_REVIEWS, JSON.stringify(reviews));
  },

  getReviewComments(): Record<number, ReviewComment[]> {
    const raw = safeGet(STORAGE_KEY_REVIEW_COMMENTS);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  saveReviewComments(map: Record<number, ReviewComment[]>): void {
    safeSet(STORAGE_KEY_REVIEW_COMMENTS, JSON.stringify(map));
  },

  getReviewAnnotations(): Record<number, ReviewAnnotation[]> {
    const raw = safeGet(STORAGE_KEY_REVIEW_ANNOTATIONS);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  saveReviewAnnotations(map: Record<number, ReviewAnnotation[]>): void {
    safeSet(STORAGE_KEY_REVIEW_ANNOTATIONS, JSON.stringify(map));
  },

  reset(): void {
    safeRemove(STORAGE_KEY_USERS);
    safeRemove(STORAGE_KEY_AUTH);
    safeRemove(STORAGE_KEY_EXPERIMENTS);
    safeRemove(STORAGE_KEY_RUNS);
    safeRemove(STORAGE_KEY_MEASUREMENTS);
    safeRemove(STORAGE_KEY_QUALITY);
    safeRemove(STORAGE_KEY_IMAGE_DATA);
    safeRemove(STORAGE_KEY_REVIEWS);
    safeRemove(STORAGE_KEY_REVIEW_COMMENTS);
    safeRemove(STORAGE_KEY_REVIEW_ANNOTATIONS);
  },
};
