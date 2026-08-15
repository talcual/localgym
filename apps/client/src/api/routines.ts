import { api } from './client';

// ──────────────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────────────

export type RoutineGoal = 'strength' | 'hypertrophy' | 'fat_loss' | 'endurance';
export type RoutineLevel = 'beginner' | 'intermediate' | 'advanced';

export interface RoutineItem {
  id: string;
  routineId: string;
  dayIndex: number;
  dayLabel: string;
  position: number;
  /** Referencia a un ejercicio del usuario (puede ser null si solo viene del catálogo). */
  exerciseId: string | null;
  /** Referencia al catálogo público. */
  catalogId: string | null;
  sets: number | null;
  reps: number | null;
  durationPerSetSec: number | null;
  restSec: number | null;
  notes: string | null;
}

export interface Routine {
  id: string;
  userId: string;
  title: string;
  goal: RoutineGoal;
  level: RoutineLevel;
  daysPerWeek: number;
  isActive: boolean;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineWithItems extends Routine {
  items: RoutineItem[];
}

// ──────────────────────────────────────────────────────────────────────────────
// DTOs (lo que enviamos al backend)
// ──────────────────────────────────────────────────────────────────────────────

export interface RoutineItemInput {
  dayIndex: number;
  dayLabel: string;
  exerciseId?: string;
  catalogId?: string;
  sets?: number;
  reps?: number;
  durationPerSetSec?: number;
  restSec?: number;
  notes?: string;
}

export interface CreateRoutineInput {
  title: string;
  goal: RoutineGoal;
  level: RoutineLevel;
  daysPerWeek: number;
  summary?: string;
  items: RoutineItemInput[];
}

export interface UpdateRoutineInput {
  title?: string;
  goal?: RoutineGoal;
  level?: RoutineLevel;
  daysPerWeek?: number;
  summary?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Cliente API
// ──────────────────────────────────────────────────────────────────────────────

export const routinesApi = {
  list: () => api.get<RoutineWithItems[]>('/routines').then((r) => r.data),

  active: () =>
    api.get<RoutineWithItems | null>('/routines/active').then((r) => r.data),

  get: (id: string) =>
    api.get<RoutineWithItems>(`/routines/${id}`).then((r) => r.data),

  create: (data: CreateRoutineInput) =>
    api.post<RoutineWithItems>('/routines', data).then((r) => r.data),

  update: (id: string, data: UpdateRoutineInput) =>
    api.patch<RoutineWithItems>(`/routines/${id}`, data).then((r) => r.data),

  activate: (id: string) =>
    api.patch<RoutineWithItems>(`/routines/${id}/activate`).then((r) => r.data),

  deactivate: () =>
    api.post<{ ok: true }>('/routines/deactivate').then((r) => r.data),

  remove: (id: string) =>
    api.delete<{ ok?: boolean }>(`/routines/${id}`).then((r) => r.data),
};

// ──────────────────────────────────────────────────────────────────────────────
// Helpers UI
// ──────────────────────────────────────────────────────────────────────────────

const GOAL_LABELS: Record<RoutineGoal, string> = {
  strength: 'Fuerza',
  hypertrophy: 'Hipertrofia',
  fat_loss: 'Pérdida de grasa',
  endurance: 'Resistencia',
};

const LEVEL_LABELS: Record<RoutineLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export function routineGoalLabel(g: RoutineGoal): string {
  return GOAL_LABELS[g];
}

export function routineLevelLabel(l: RoutineLevel): string {
  return LEVEL_LABELS[l];
}

/** Agrupa los items por día para renderizarlos. */
export function groupRoutineItemsByDay(
  items: RoutineItem[],
): Array<{ dayIndex: number; dayLabel: string; items: RoutineItem[] }> {
  const map = new Map<number, { dayIndex: number; dayLabel: string; items: RoutineItem[] }>();
  for (const it of items) {
    const cur = map.get(it.dayIndex) ?? {
      dayIndex: it.dayIndex,
      dayLabel: it.dayLabel,
      items: [] as RoutineItem[],
    };
    cur.items.push(it);
    map.set(it.dayIndex, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.dayIndex - b.dayIndex);
}
