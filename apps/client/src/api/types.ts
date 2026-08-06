export type ExerciseType = 'TIME' | 'REPS' | 'MIXED';

export type Sex = 'MALE' | 'FEMALE' | 'OTHER';

export type BmiCategory =
  | 'UNDERWEIGHT'
  | 'NORMAL'
  | 'OVERWEIGHT'
  | 'OBESE_I'
  | 'OBESE_II'
  | 'OBESE_III';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface UserProfile extends AuthUser {
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
  exercise?: Exercise;
}

export interface SummaryStats {
  totalSessions: number;
  totalDurationSec: number;
  totalReps: number;
  currentStreakDays: number;
  bestStreakDays: number;
  uniqueExercises: number;
}

export interface DailyCount {
  date: string;
  sessions: number;
  durationSec: number;
}

export interface ExerciseAggregate {
  exerciseId: string;
  exerciseName: string;
  sessions: number;
  totalDurationSec: number;
  totalReps: number;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser;
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

export interface BmiInfo {
  bmi: number | null;
  category: BmiCategory | null;
  categoryLabel: string | null;
  weightKg: number | null;
  heightCm: number | null;
}

export interface ProgressSummary {
  bmi: BmiInfo;
  latestWeight: WeightEntry | null;
  previousWeight: WeightEntry | null;
  weightDelta: number | null;
  latestMeasurement: BodyMeasurement | null;
  previousMeasurement: BodyMeasurement | null;
}

export interface BmiHistoryPoint {
  recordedAt: string;
  bmi: number;
  weightKg: number;
}
