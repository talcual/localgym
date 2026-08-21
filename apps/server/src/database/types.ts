export const EXERCISE_TYPES = ['TIME', 'REPS', 'MIXED'] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const EXERCISE_SOURCES = ['manual', 'ai_import'] as const;
export type ExerciseSource = (typeof EXERCISE_SOURCES)[number];

export const SEX_VALUES = ['MALE', 'FEMALE', 'OTHER'] as const;
export type Sex = (typeof SEX_VALUES)[number];

export const USER_ROLES = ['CLIENT', 'INSTRUCTOR', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  heightCm: number | null;
  sex: Sex | null;
  birthdate: string | null;
  role: UserRole;
  /** Duplicado denormalizado de `role === 'INSTRUCTOR'` para queries rápidas. */
  isInstructor: boolean;
  createdAt: string;
}

// ─── Instructores ─────────────────────────────────────────────────────────────

export const INSTRUCTOR_RELATION_STATUSES = [
  'PENDING',
  'ACTIVE',
  'REVOKED',
] as const;
export type InstructorRelationStatus =
  (typeof INSTRUCTOR_RELATION_STATUSES)[number];

/** Relación 1 instructor ↔ 1 cliente (un cliente tiene a lo sumo un instructor activo). */
export interface InstructorClient {
  id: string;
  instructorId: string;
  clientId: string;
  status: InstructorRelationStatus;
  invitedAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export const INVITATION_KINDS = ['EMAIL', 'CODE'] as const;
export type InvitationKind = (typeof INVITATION_KINDS)[number];

/** Invitación pendiente (email o código compartible). */
export interface InstructorInvitation {
  id: string;
  instructorId: string;
  clientEmail: string;
  token: string;
  kind: InvitationKind;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export const ROUTINE_ASSIGNMENT_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
export type RoutineAssignmentStatus =
  (typeof ROUTINE_ASSIGNMENT_STATUSES)[number];

/** Asignación de una rutina a un cliente con ventana de fechas. */
export interface RoutineAssignment {
  id: string;
  routineId: string;
  clientId: string;
  instructorId: string;
  startDate: string; // ISO date 'YYYY-MM-DD'
  endDate: string | null;
  status: RoutineAssignmentStatus;
  createdAt: string;
}

export interface RoutineAssignmentWithRoutine extends RoutineAssignment {
  routine: Routine | null;
}

// ─── Mensajería ───────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

/** Conversación agregada para listar hilos. */
export interface MessageThread {
  userId: string;
  displayName: string;
  lastMessage: Message;
  unreadCount: number;
}

// ─── Rutinas extendidas (para el área de instructores) ────────────────────────

export interface RoutineWindow {
  startDate: string;
  endDate: string | null;
}

/** Rutina enriquecida con metadatos de asignación por instructor. */
export interface RoutineWithAssignment extends RoutineWithItems {
  writtenByInstructorId: string | null;
  assignedByInstructor: boolean;
  assignedInstructorId: string | null;
  assignedInstructorName: string | null;
  assignmentWindow: RoutineWindow | null;
}

export interface Exercise {
  id: string;
  userId: string;
  name: string;
  type: ExerciseType;
  sets: number;
  durationPerSetSec: number | null;
  repsPerSet: number | null;
  restSec: number;
  notes: string | null;
  /** Cómo se creó este ejercicio en la cuenta del usuario. */
  source: ExerciseSource;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ejercicio enriquecido con el conteo de rutinas en las que aparece.
 * `routineCount === 0` → ejercicio libre (no asociado a ninguna rutina).
 */
export interface ExerciseWithRoutineCount extends Exercise {
  routineCount: number;
}

export interface SessionLog {
  id: string;
  userId: string;
  exerciseId: string;
  performedAt: string;
  setsCompleted: number;
  totalDurationSec: number;
  totalReps: number;
  notes: string | null;
  createdAt: string;
}

export interface SessionLogWithExercise extends SessionLog {
  exercise: Exercise | null;
}

export interface CatalogExercise {
  id: string;
  name: string;
  type: ExerciseType;
  sets: number;
  durationPerSetSec: number | null;
  repsPerSet: number | null;
  restSec: number;
  notes: string | null;
  category: string | null;
  createdAt: string;
}

export interface WeightEntry {
  id: string;
  userId: string;
  weightKg: number;
  recordedAt: string;
  note: string | null;
  createdAt: string;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  recordedAt: string;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  leftArmCm: number | null;
  rightArmCm: number | null;
  leftThighCm: number | null;
  rightThighCm: number | null;
  leftCalfCm: number | null;
  rightCalfCm: number | null;
  neckCm: number | null;
  shouldersCm: number | null;
  bodyFatPct: number | null;
  note: string | null;
  createdAt: string;
}

export type BmiCategory =
  | 'UNDERWEIGHT'
  | 'NORMAL'
  | 'OVERWEIGHT'
  | 'OBESE_I'
  | 'OBESE_II'
  | 'OBESE_III';

export interface BmiInfo {
  bmi: number | null;
  category: BmiCategory | null;
  categoryLabel: string | null;
  weightKg: number | null;
  heightCm: number | null;
}

export type RoutineGoal = 'strength' | 'hypertrophy' | 'fat_loss' | 'endurance';
export type RoutineLevel = 'beginner' | 'intermediate' | 'advanced';

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

export interface RoutineItem {
  id: string;
  routineId: string;
  dayIndex: number;
  dayLabel: string;
  position: number;
  /** Puede ser NULL si solo referencia el catálogo (el usuario no lo tiene aún). */
  exerciseId: string | null;
  /** Referencia al catálogo público cuando el usuario aún no creó el ejercicio. */
  catalogId: string | null;
  sets: number | null;
  reps: number | null;
  durationPerSetSec: number | null;
  restSec: number | null;
  notes: string | null;
}

export interface RoutineWithItems extends Routine {
  items: RoutineItem[];
  /** ID del instructor que escribió la rutina en nombre del cliente (null si fue el propio cliente). */
  writtenByInstructorId: string | null;
}
