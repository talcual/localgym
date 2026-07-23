export const EXERCISE_TYPES = ['TIME', 'REPS', 'MIXED'] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
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
