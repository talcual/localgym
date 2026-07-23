import { Inject, Injectable } from '@nestjs/common';
import { Client } from '@libsql/client';

import { DATABASE } from '../../database/database.tokens';

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

@Injectable()
export class StatsService {
  constructor(@Inject(DATABASE) private readonly db: Client) {}

  async summary(userId: string): Promise<SummaryStats> {
    const res = await this.db.execute({
      sql: `SELECT sets_completed, total_duration_sec, total_reps, performed_at, exercise_id
            FROM session_logs WHERE user_id = ?`,
      args: [userId],
    });

    if (res.rows.length === 0) {
      return {
        totalSessions: 0,
        totalDurationSec: 0,
        totalReps: 0,
        currentStreakDays: 0,
        bestStreakDays: 0,
        uniqueExercises: 0,
      };
    }

    const totalSessions = res.rows.length;
    let totalDurationSec = 0;
    let totalReps = 0;
    const days = new Set<string>();
    const exercises = new Set<string>();

    for (const row of res.rows) {
      totalDurationSec += Number(row.total_duration_sec);
      totalReps += Number(row.total_reps);
      days.add(toDateKey(new Date(String(row.performed_at))));
      exercises.add(String(row.exercise_id));
    }

    const sortedDays = Array.from(days).sort();
    const { current, best } = computeStreaks(sortedDays);

    return {
      totalSessions,
      totalDurationSec,
      totalReps,
      currentStreakDays: current,
      bestStreakDays: best,
      uniqueExercises: exercises.size,
    };
  }

  async byDay(userId: string, days: number): Promise<DailyCount[]> {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const res = await this.db.execute({
      sql: `SELECT performed_at, total_duration_sec
            FROM session_logs
            WHERE user_id = ? AND performed_at >= ?`,
      args: [userId, since.toISOString()],
    });

    const buckets = new Map<string, { sessions: number; durationSec: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      buckets.set(toDateKey(d), { sessions: 0, durationSec: 0 });
    }

    for (const row of res.rows) {
      const key = toDateKey(new Date(String(row.performed_at)));
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.sessions += 1;
        bucket.durationSec += Number(row.total_duration_sec);
      }
    }

    return Array.from(buckets.entries()).map(([date, value]) => ({
      date,
      sessions: value.sessions,
      durationSec: value.durationSec,
    }));
  }

  async byExercise(userId: string): Promise<ExerciseAggregate[]> {
    const res = await this.db.execute({
      sql: `SELECT s.exercise_id, s.total_duration_sec, s.total_reps, e.name as exercise_name
            FROM session_logs s
            LEFT JOIN exercises e ON e.id = s.exercise_id
            WHERE s.user_id = ?`,
      args: [userId],
    });

    const map = new Map<string, ExerciseAggregate>();
    for (const row of res.rows) {
      const id = String(row.exercise_id);
      const existing = map.get(id) ?? {
        exerciseId: id,
        exerciseName: row.exercise_name
          ? String(row.exercise_name)
          : 'Ejercicio',
        sessions: 0,
        totalDurationSec: 0,
        totalReps: 0,
      };
      existing.sessions += 1;
      existing.totalDurationSec += Number(row.total_duration_sec);
      existing.totalReps += Number(row.total_reps);
      map.set(id, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.sessions - a.sessions);
  }
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function computeStreaks(sortedDays: string[]): { current: number; best: number } {
  if (sortedDays.length === 0) return { current: 0, best: 0 };
  const dates = sortedDays.map((d) => new Date(d + 'T00:00:00'));
  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = Math.round(
      (dates[i].getTime() - dates[i - 1].getTime()) / 86400000,
    );
    if (diff === 1) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }

  let current = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = dates[dates.length - 1];
  const diffFromLast = Math.round(
    (today.getTime() - last.getTime()) / 86400000,
  );
  if (diffFromLast === 0 || diffFromLast === 1) {
    current = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      const diff = Math.round(
        (dates[i].getTime() - dates[i - 1].getTime()) / 86400000,
      );
      if (diff === 1) current += 1;
      else break;
    }
  }

  return { current, best };
}
