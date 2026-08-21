import { api } from './client';
import { getUserTimeZone } from '../utils/timezone';
import type {
  AuthResponse,
  AuthUser,
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
  UserRole,
  WeightEntry,
} from './types';

export const authApi = {
  register: (
    email: string,
    password: string,
    displayName: string,
    role?: UserRole,
  ) =>
    api
      .post<AuthResponse>('/auth/register', { email, password, displayName, role })
      .then((r) => r.data),
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),
};

export const usersApi = {
  me: () => api.get<UserProfile>('/users/me').then((r) => r.data),
  update: (
    data: Partial<
      Pick<UserProfile, 'displayName' | 'heightCm' | 'sex' | 'birthdate'>
    >,
  ) => api.patch<UserProfile>('/users/me', data).then((r) => r.data),
};

import type { ExerciseWithRoutineCount } from './types';

export const exercisesApi = {
  list: (clientId?: string) =>
    api
      .get<ExerciseWithRoutineCount[]>(
        '/exercises',
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
  listFree: (clientId?: string) =>
    api
      .get<ExerciseWithRoutineCount[]>(
        '/exercises/free',
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
  listManual: (clientId?: string) =>
    api
      .get<Exercise[]>(
        '/exercises/manual',
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
  listImported: (clientId?: string) =>
    api
      .get<Exercise[]>(
        '/exercises/imported',
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
  get: (id: string) =>
    api.get<Exercise>(`/exercises/${id}`).then((r) => r.data),
  create: (data: Partial<Exercise>, clientId?: string) =>
    api
      .post<Exercise>(
        '/exercises',
        data,
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
  update: (id: string, data: Partial<Exercise>) =>
    api.patch<Exercise>(`/exercises/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/exercises/${id}`).then((r) => r.data),
};

export const sessionsApi = {
  list: (
    params?: { from?: string; to?: string; exerciseId?: string },
    clientId?: string,
  ) =>
    api
      .get<SessionLog[]>('/sessions', {
        params: { ...params, ...(clientId ? { clientId } : {}) },
      })
      .then((r) => r.data),
  get: (id: string) =>
    api.get<SessionLog>(`/sessions/${id}`).then((r) => r.data),
  create: (
    data: {
      exerciseId: string;
      setsCompleted: number;
      totalDurationSec?: number;
      totalReps?: number;
      notes?: string;
      performedAt?: string;
    },
    clientId?: string,
  ) =>
    api
      .post<SessionLog>(
        '/sessions',
        data,
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
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
  summary: (clientId?: string) =>
    api
      .get<SummaryStats>('/stats/summary', {
        params: { tz: getUserTimeZone(), ...(clientId ? { clientId } : {}) },
      })
      .then((r) => r.data),
  byDay: (days = 30, clientId?: string) =>
    api
      .get<DailyCount[]>('/stats/by-day', {
        params: {
          days,
          tz: getUserTimeZone(),
          ...(clientId ? { clientId } : {}),
        },
      })
      .then((r) => r.data),
  byExercise: (clientId?: string) =>
    api
      .get<ExerciseAggregate[]>(
        '/stats/by-exercise',
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
};

export const weightApi = {
  list: (clientId?: string) =>
    api
      .get<WeightEntry[]>(
        '/weight',
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
  latest: (clientId?: string) =>
    api
      .get<WeightEntry | null>(
        '/weight/latest',
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
  create: (
    data: { weightKg: number; recordedAt?: string; note?: string },
    clientId?: string,
  ) =>
    api
      .post<WeightEntry>(
        '/weight',
        data,
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/weight/${id}`).then((r) => r.data),
};

export const measurementsApi = {
  list: (clientId?: string) =>
    api
      .get<BodyMeasurement[]>(
        '/measurements',
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
  latest: (clientId?: string) =>
    api
      .get<BodyMeasurement | null>(
        '/measurements/latest',
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
  create: (
    data: Partial<
      Omit<BodyMeasurement, 'id' | 'userId' | 'recordedAt' | 'createdAt'>
    > & { recordedAt?: string },
    clientId?: string,
  ) =>
    api
      .post<BodyMeasurement>(
        '/measurements',
        data,
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/measurements/${id}`).then((r) => r.data),
};

export const progressApi = {
  summary: (clientId?: string) =>
    api
      .get<ProgressSummary>(
        '/progress/summary',
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
  bmiHistory: (clientId?: string) =>
    api
      .get<BmiHistoryPoint[]>(
        '/progress/bmi-history',
        clientId ? { params: { clientId } } : undefined,
      )
      .then((r) => r.data),
};

export { routinesApi } from './routines';
export { instructorsApi } from './instructors';
export { assignmentsApi } from './assignments';
export { messagesApi } from './messages';

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
  ExerciseWithRoutineCount,
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
  UserRole,
  InstructorClient,
  InstructorInvitation,
  InviteResult,
  RoutineAssignment,
  Message,
  MessageThread,
} from './types';