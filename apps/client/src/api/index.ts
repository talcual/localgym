import { api } from './client';
import {
  AuthResponse,
  DailyCount,
  Exercise,
  ExerciseAggregate,
  SessionLog,
  SummaryStats,
} from './types';

export const authApi = {
  register: (email: string, password: string, displayName: string) =>
    api.post<AuthResponse>('/auth/register', { email, password, displayName }).then((r) => r.data),
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const exercisesApi = {
  list: () => api.get<Exercise[]>('/exercises').then((r) => r.data),
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

export const statsApi = {
  summary: () => api.get<SummaryStats>('/stats/summary').then((r) => r.data),
  byDay: (days = 30) =>
    api.get<DailyCount[]>('/stats/by-day', { params: { days } }).then((r) => r.data),
  byExercise: () =>
    api.get<ExerciseAggregate[]>('/stats/by-exercise').then((r) => r.data),
};
