export const EXERCISE_TYPES = ['TIME', 'REPS', 'MIXED'] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const SEX_VALUES = ['MALE', 'FEMALE', 'OTHER'] as const;
export type Sex = (typeof SEX_VALUES)[number];

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  heightCm: number | null;
  sex: Sex | null;
  birthdate: string | null;
  createdAt: string;
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
  createdAt: string;
  updatedAt: string;
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
