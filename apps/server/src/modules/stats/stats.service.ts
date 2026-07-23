import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SessionLog } from '../sessions/entities/session-log.entity';

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
  constructor(
    @InjectRepository(SessionLog)
    private readonly sessionsRepository: Repository<SessionLog>,
  ) {}

  async summary(userId: string): Promise<SummaryStats> {
    const sessions = await this.sessionsRepository.find({
      where: { userId },
      relations: ['exercise'],
    });

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalDurationSec: 0,
        totalReps: 0,
        currentStreakDays: 0,
        bestStreakDays: 0,
        uniqueExercises: 0,
      };
    }

    const totalSessions = sessions.length;
    const totalDurationSec = sessions.reduce(
      (acc, s) => acc + s.totalDurationSec,
      0,
    );
    const totalReps = sessions.reduce((acc, s) => acc + s.totalReps, 0);
    const uniqueExercises = new Set(sessions.map((s) => s.exerciseId)).size;

    const days = new Set(
      sessions.map((s) => this.toDateKey(new Date(s.performedAt))),
    );
    const sortedDays = Array.from(days).sort();
    const { current, best } = this.computeStreaks(sortedDays);

    return {
      totalSessions,
      totalDurationSec,
      totalReps,
      currentStreakDays: current,
      bestStreakDays: best,
      uniqueExercises,
    };
  }

  async byDay(userId: string, days: number): Promise<DailyCount[]> {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const sessions = await this.sessionsRepository.find({
      where: { userId },
    });

    const buckets = new Map<string, { sessions: number; durationSec: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      buckets.set(this.toDateKey(d), { sessions: 0, durationSec: 0 });
    }

    for (const s of sessions) {
      const key = this.toDateKey(new Date(s.performedAt));
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.sessions += 1;
        bucket.durationSec += s.totalDurationSec;
      }
    }

    return Array.from(buckets.entries()).map(([date, value]) => ({
      date,
      sessions: value.sessions,
      durationSec: value.durationSec,
    }));
  }

  async byExercise(userId: string): Promise<ExerciseAggregate[]> {
    const sessions = await this.sessionsRepository.find({
      where: { userId },
      relations: ['exercise'],
    });

    const map = new Map<string, ExerciseAggregate>();
    for (const s of sessions) {
      const key = s.exerciseId;
      const existing = map.get(key) ?? {
        exerciseId: key,
        exerciseName: s.exercise?.name ?? 'Ejercicio',
        sessions: 0,
        totalDurationSec: 0,
        totalReps: 0,
      };
      existing.sessions += 1;
      existing.totalDurationSec += s.totalDurationSec;
      existing.totalReps += s.totalReps;
      map.set(key, existing);
    }

    return Array.from(map.values()).sort(
      (a, b) => b.sessions - a.sessions,
    );
  }

  private toDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private computeStreaks(sortedDays: string[]): {
    current: number;
    best: number;
  } {
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
}
