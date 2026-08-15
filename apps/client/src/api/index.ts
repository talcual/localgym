import { api } from './client';
import {
  AuthResponse,
  BodyMeasurement,
  BmiHistoryPoint,
  CatalogExercise,
  DailyCount,
  Exercise,
  ExerciseAggregate,
  ProgressSummary,
  SessionLog,
  SummaryStats,
  UserProfile,
  WeightEntry,
} from './types';

export const authApi = {
  register: (email: string, password: string, displayName: string) =>
    api.post<AuthResponse>('/auth/register', { email, password, displayName }).then((r) => r.data),
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const usersApi = {
  me: () => api.get<UserProfile>('/users/me').then((r) => r.data),
  update: (data: Partial<Pick<UserProfile, 'displayName' | 'heightCm' | 'sex' | 'birthdate'>>) =>
    api.patch<UserProfile>('/users/me', data).then((r) => r.data),
};

export const exercisesApi = {
  list: () => api.get<Exercise[]>('/exercises').then((r) => r.data),
  /** Solo los ejercicios creados manualmente (excluye los importados por AI). */
  listManual: () => api.get<Exercise[]>('/exercises/manual').then((r) => r.data),
  /** Solo los ejercicios importados desde el catálogo (AI Couch). */
  listImported: () =>
    api.get<Exercise[]>('/exercises/imported').then((r) => r.data),
  get: (id: string) => api.get<Exercise>(`/exercises/${id}`).then((r) => r.data),
  create: (data: Partial<Exercise>) =>
    api.post<Exercise>('/exercises', data).then((r) => r.data),
  update: (id: string, data: Partial<Exercise>) =>
    api.patch<Exercise>(`/exercises/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/exercises/${id}`).then((r) => r.data),
};

export const sessionsApi = {
  list: (params?: { from?: string; to?: string; exerciseId?: string }) =>
    api.get<SessionLog[]>('/sessions', { params }).then((r) => r.data),
  get: (id: string) => api.get<SessionLog>(`/sessions/${id}`).then((r) => r.data),
  create: (data: {
    exerciseId: string;
    setsCompleted: number;
    totalDurationSec?: number;
    totalReps?: number;
    notes?: string;
    performedAt?: string;
  }) => api.post<SessionLog>('/sessions', data).then((r) => r.data),
};

export const catalogApi = {
  list: (params?: { category?: string; search?: string }) =>
    api.get<CatalogExercise[]>('/catalog', { params }).then((r) => r.data),
  categories: () =>
    api.get<string[]>('/catalog/categories').then((r) => r.data),
  import: (id: string) =>
    api.post<Exercise>(`/catalog/${id}/import`).then((r) => r.data),
};

export const statsApi = {
  summary: () => api.get<SummaryStats>('/stats/summary').then((r) => r.data),
  byDay: (days = 30) =>
    api.get<DailyCount[]>('/stats/by-day', { params: { days } }).then((r) => r.data),
  byExercise: () =>
    api.get<ExerciseAggregate[]>('/stats/by-exercise').then((r) => r.data),
};

export const weightApi = {
  list: () => api.get<WeightEntry[]>('/weight').then((r) => r.data),
  latest: () => api.get<WeightEntry | null>('/weight/latest').then((r) => r.data),
  create: (data: { weightKg: number; recordedAt?: string; note?: string }) =>
    api.post<WeightEntry>('/weight', data).then((r) => r.data),
  remove: (id: string) => api.delete(`/weight/${id}`).then((r) => r.data),
};

export const measurementsApi = {
  list: () => api.get<BodyMeasurement[]>('/measurements').then((r) => r.data),
  latest: () => api.get<BodyMeasurement | null>('/measurements/latest').then((r) => r.data),
  create: (data: Partial<Omit<BodyMeasurement, 'id' | 'userId' | 'recordedAt' | 'createdAt'>> & { recordedAt?: string }) =>
    api.post<BodyMeasurement>('/measurements', data).then((r) => r.data),
  remove: (id: string) => api.delete(`/measurements/${id}`).then((r) => r.data),
};

export const progressApi = {
  summary: () => api.get<ProgressSummary>('/progress/summary').then((r) => r.data),
  bmiHistory: () => api.get<BmiHistoryPoint[]>('/progress/bmi-history').then((r) => r.data),
};

export { routinesApi } from './routines';
export type {
  Routine,
  RoutineItem,
  RoutineWithItems,
  RoutineGoal,
  RoutineLevel,
  RoutineItemInput,
  CreateRoutineInput,
  UpdateRoutineInput,
} from './routines';

export type {
  AuthResponse,
  BodyMeasurement,
  BmiHistoryPoint,
  CatalogExercise,
  DailyCount,
  Exercise,
  ExerciseSource,
  ExerciseAggregate,
  ProgressSummary,
  SessionLog,
  SummaryStats,
  UserProfile,
  WeightEntry,
  AuthUser,
  BmiInfo,
  BmiCategory,
  Sex,
  ExerciseType,
} from './types';
