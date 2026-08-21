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
  /** ID del instructor que creó la rutina en nombre del cliente (null si fue el propio cliente). */
  writtenByInstructorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineWindow {
  startDate: string;
  endDate: string | null;
}

export interface RoutineWithItems extends Routine {
  items: RoutineItem[];
  /** True si la rutina tiene una asignación ACTIVE vigente al día de hoy. */
  assignedByInstructor?: boolean;
  assignedInstructorId?: string | null;
  assignedInstructorName?: string | null;
  assignmentWindow?: RoutineWindow | null;
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
  /**
   * Nombre del ejercicio (catálogo o propio del cliente). NO se envía al
   * backend — sólo se usa para mostrar el nombre en el editor mientras el
   * instructor edita la rutina, en lugar del UUID.
   */
  _exerciseName?: string;
  /**
   * Fuente del ejercicio: catálogo público o ejercicio del cliente. Tampoco
   * se envía al backend; sólo UI.
   */
  _exerciseSource?: 'catalog' | 'client';
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
  list: (clientId?: string) =>
    api
      .get<RoutineWithItems[]>('/routines', clientId ? { params: { clientId } } : undefined)
      .then((r) => r.data),

  active: (clientId?: string) =>
    api
      .get<RoutineWithItems | null>('/routines/active', clientId ? { params: { clientId } } : undefined)
      .then((r) => r.data),

  get: (id: string) =>
    api.get<RoutineWithItems>(`/routines/${id}`).then((r) => r.data),

  create: (data: CreateRoutineInput, clientId?: string) =>
    api
      .post<RoutineWithItems>('/routines', data, clientId ? { params: { clientId } } : undefined)
      .then((r) => r.data),

  update: (id: string, data: UpdateRoutineInput) =>
    api.patch<RoutineWithItems>(`/routines/${id}`, data).then((r) => r.data),

  replaceItems: (id: string, items: RoutineItemInput[]) =>
    api.put<RoutineWithItems>(`/routines/${id}/items`, { items }).then((r) => r.data),

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
