import { Experiment, Role, User } from '../../types';

export interface StoredUser extends User {
  passwordHash: string; // for mock verification
}

const STORAGE_KEY_USERS = 'cellscope_users';
const STORAGE_KEY_AUTH = 'cellscope_auth_user';
const STORAGE_KEY_EXPERIMENTS = 'cellscope_experiments';

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
    files: [],
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

// In-memory fallback if localStorage is inaccessible
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

  reset(): void {
    safeRemove(STORAGE_KEY_USERS);
    safeRemove(STORAGE_KEY_AUTH);
    safeRemove(STORAGE_KEY_EXPERIMENTS);
  },
};
