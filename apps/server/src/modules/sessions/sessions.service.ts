import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Client } from '@libsql/client';
import { v4 as uuid } from 'uuid';

import { DATABASE } from '../../database/database.tokens';
import { Exercise, SessionLogWithExercise } from '../../database/types';
import { CreateSessionDto } from './dto/create-session.dto';

export interface ListSessionsFilter {
  from?: string;
  to?: string;
  exerciseId?: string;
}

@Injectable()
export class SessionsService {
  constructor(@Inject(DATABASE) private readonly db: Client) {}

  async list(
    userId: string,
    filter: ListSessionsFilter,
  ): Promise<SessionLogWithExercise[]> {
    const where: string[] = ['s.user_id = ?'];
    const args: any[] = [userId];

    if (filter.exerciseId) {
      where.push('s.exercise_id = ?');
      args.push(filter.exerciseId);
    }
    if (filter.from) {
      where.push('s.performed_at >= ?');
      args.push(new Date(filter.from).toISOString());
    }
    if (filter.to) {
      where.push('s.performed_at <= ?');
      args.push(new Date(filter.to).toISOString());
    }

    const sql = `
      SELECT s.*, e.id as e_id, e.user_id as e_user_id, e.name as e_name,
             e.type as e_type, e.sets as e_sets,
             e.duration_per_set_sec as e_dur, e.reps_per_set as e_reps,
             e.rest_sec as e_rest, e.notes as e_notes,
             e.created_at as e_created_at, e.updated_at as e_updated_at
      FROM session_logs s
      LEFT JOIN exercises e ON e.id = s.exercise_id
      WHERE ${where.join(' AND ')}
      ORDER BY s.performed_at DESC
      LIMIT 200
    `;
    const res = await this.db.execute({ sql, args });
    return res.rows.map(mapSessionWithExercise);
  }

  async findOne(
    userId: string,
    id: string,
  ): Promise<SessionLogWithExercise> {
    const res = await this.db.execute({
      sql: `SELECT s.*, e.id as e_id, e.user_id as e_user_id, e.name as e_name,
                   e.type as e_type, e.sets as e_sets,
                   e.duration_per_set_sec as e_dur, e.reps_per_set as e_reps,
                   e.rest_sec as e_rest, e.notes as e_notes,
                   e.created_at as e_created_at, e.updated_at as e_updated_at
            FROM session_logs s
            LEFT JOIN exercises e ON e.id = s.exercise_id
            WHERE s.id = ?`,
      args: [id],
    });
    const row = res.rows[0];
    if (!row) throw new NotFoundException('Sesión no encontrada');
    const mapped = mapSessionWithExercise(row);
    if (mapped.userId !== userId)
      throw new ForbiddenException('No autorizado');
    return mapped;
  }

  async create(
    userId: string,
    dto: CreateSessionDto,
  ): Promise<SessionLogWithExercise> {
    const exRes = await this.db.execute({
      sql: 'SELECT * FROM exercises WHERE id = ?',
      args: [dto.exerciseId],
    });
    const exRow = exRes.rows[0];
    if (!exRow) throw new NotFoundException('Ejercicio no encontrado');
    if (String(exRow.user_id) !== userId)
      throw new ForbiddenException('No autorizado');

    const exercise: Exercise = {
      id: String(exRow.id),
      userId: String(exRow.user_id),
      name: String(exRow.name),
      type: exRow.type as any,
      sets: Number(exRow.sets),
      durationPerSetSec:
        exRow.duration_per_set_sec == null
          ? null
          : Number(exRow.duration_per_set_sec),
      repsPerSet:
        exRow.reps_per_set == null ? null : Number(exRow.reps_per_set),
      restSec: Number(exRow.rest_sec),
      notes: exRow.notes == null ? null : String(exRow.notes),
      createdAt: String(exRow.created_at),
      updatedAt: String(exRow.updated_at),
    };

    const totalDurationSec =
      dto.totalDurationSec ??
      (exercise.durationPerSetSec
        ? exercise.durationPerSetSec * dto.setsCompleted
        : 0);
    const totalReps =
      dto.totalReps ??
      (exercise.repsPerSet ? exercise.repsPerSet * dto.setsCompleted : 0);

    const id = uuid();
    const performedAt = dto.performedAt
      ? new Date(dto.performedAt).toISOString()
      : new Date().toISOString();

    await this.db.execute({
      sql: `INSERT INTO session_logs
        (id, user_id, exercise_id, performed_at, sets_completed,
         total_duration_sec, total_reps, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        userId,
        dto.exerciseId,
        performedAt,
        dto.setsCompleted,
        totalDurationSec,
        totalReps,
        dto.notes ?? null,
      ],
    });

    return this.findOne(userId, id);
  }
}

function mapSessionWithExercise(row: any): SessionLogWithExercise {
  const hasExercise = row.e_id != null;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    exerciseId: String(row.exercise_id),
    performedAt: String(row.performed_at),
    setsCompleted: Number(row.sets_completed),
    totalDurationSec: Number(row.total_duration_sec),
    totalReps: Number(row.total_reps),
    notes: row.notes == null ? null : String(row.notes),
    createdAt: String(row.created_at),
    exercise: hasExercise
      ? {
          id: String(row.e_id),
          userId: String(row.e_user_id),
          name: String(row.e_name),
          type: row.e_type as any,
          sets: Number(row.e_sets),
          durationPerSetSec:
            row.e_dur == null ? null : Number(row.e_dur),
          repsPerSet: row.e_reps == null ? null : Number(row.e_reps),
          restSec: Number(row.e_rest),
          notes: row.e_notes == null ? null : String(row.e_notes),
          createdAt: String(row.e_created_at),
          updatedAt: String(row.e_updated_at),
        }
      : null,
  };
}
