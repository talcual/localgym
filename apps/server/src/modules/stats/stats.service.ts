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

  async summary(userId: string, tz?: string): Promise<SummaryStats> {
    const zone = sanitizeTimeZone(tz);

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
      days.add(toDateKey(new Date(String(row.performed_at)), zone));
      exercises.add(String(row.exercise_id));
    }

    const sortedDays = Array.from(days).sort();
    const { current, best } = computeStreaks(sortedDays, zone);

    return {
      totalSessions,
      totalDurationSec,
      totalReps,
      currentStreakDays: current,
      bestStreakDays: best,
      uniqueExercises: exercises.size,
    };
  }

  async byDay(userId: string, days: number, tz?: string): Promise<DailyCount[]> {
    const zone = sanitizeTimeZone(tz);

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
      buckets.set(toDateKey(d, zone), { sessions: 0, durationSec: 0 });
    }

    for (const row of res.rows) {
      const key = toDateKey(new Date(String(row.performed_at)), zone);
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

/**
 * Valida una zona horaria IANA. Si no se pasa o es inválida, devuelve undefined
 * (se usará la zona del servidor como antes).
 */
function sanitizeTimeZone(tz?: string | null): string | undefined {
  if (!tz || typeof tz !== 'string') return undefined;
  const trimmed = tz.trim();
  if (!trimmed) return undefined;
  try {
    // Lanzará si la zona no es IANA válida.
    new Intl.DateTimeFormat('en-US', { timeZone: trimmed }).format(new Date());
    return trimmed;
  } catch {
    return undefined;
  }
}

/**
 * Devuelve YYYY-MM-DD interpretado en la zona indicada (o la del servidor).
 * Usa `Intl.DateTimeFormat.formatToParts` para no depender de getHours(),
 * que reflejaría la zona del servidor.
 */
function toDateKey(d: Date, zone?: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function todayKey(zone?: string): string {
  return toDateKey(new Date(), zone);
}

function computeStreaks(
  sortedDays: string[],
  zone?: string,
): { current: number; best: number } {
  if (sortedDays.length === 0) return { current: 0, best: 0 };
  const dates = sortedDays.map((d) => new Date(d + 'T12:00:00Z'));
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
  const today = todayKey(zone);
  const last = sortedDays[sortedDays.length - 1];
  if (last === today || daysBetween(last, today, zone) === 1) {
    current = 1;
    for (let i = sortedDays.length - 1; i > 0; i--) {
      const diff = daysBetween(sortedDays[i - 1], sortedDays[i], zone);
      if (diff === 1) current += 1;
      else break;
    }
  }

  return { current, best };
}

function daysBetween(a: string, b: string, zone?: string): number {
  // Diferencia de días entre dos YYYY-MM-DD interpretadas en `zone`.
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const aDate = new Date(Date.UTC(ay, am - 1, ad, 12));
  const bDate = new Date(Date.UTC(by, bm - 1, bd, 12));
  const offsetA = tzOffsetMinutes(aDate, zone);
  const offsetB = tzOffsetMinutes(bDate, zone);
  const aMid = aDate.getTime() + offsetA * 60_000;
  const bMid = bDate.getTime() + offsetB * 60_000;
  return Math.round((bMid - aMid) / 86400000);
}

function tzOffsetMinutes(d: Date, zone?: string): number {
  // Minutos de diferencia entre UTC y la zona del usuario al instante `d`.
  // Para Etc/GMT+5 (UTC-5) la diferencia es -300.
  if (!zone) return -d.getTimezoneOffset();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    timeZoneName: 'shortOffset',
  });
  const parts = fmt.formatToParts(d);
  const part = parts.find((p) => p.type === 'timeZoneName');
  const m = part?.value?.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  const hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  // Para Etc/GMT+5, "GMT+5" significa UTC-5, así que invertimos el signo.
  return -(hours * 60 + minutes);
}
