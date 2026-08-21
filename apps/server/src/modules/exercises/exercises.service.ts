import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Client } from '@libsql/client';
import { v4 as uuid } from 'uuid';

import { DATABASE } from '../../database/database.tokens';
import {
  Exercise,
  ExerciseSource,
  ExerciseType,
  ExerciseWithRoutineCount,
  UserRole,
} from '../../database/types';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { InstructorsService } from '../instructors/instructors.service';

@Injectable()
export class ExercisesService {
  constructor(
    @Inject(DATABASE) private readonly db: Client,
    private readonly instructorsService: InstructorsService,
  ) {}

  async list(
    actorUserId: string,
    actorRole: UserRole,
    actingUserId: string,
  ): Promise<ExerciseWithRoutineCount[]> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      actingUserId,
    );
    const res = await this.db.execute({
      sql: `
        SELECT e.*, COUNT(ri.id) AS routine_count
        FROM exercises e
        LEFT JOIN routine_items ri
          ON ri.exercise_id = e.id
          AND ri.routine_id IN (
            SELECT id FROM routines WHERE user_id = ?
          )
        WHERE e.user_id = ?
        GROUP BY e.id
        ORDER BY e.created_at DESC
      `,
      args: [actingUserId, actingUserId],
    });
    return res.rows.map(mapExerciseWithCount);
  }

  async listFree(
    actorUserId: string,
    actorRole: UserRole,
    actingUserId: string,
  ): Promise<ExerciseWithRoutineCount[]> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      actingUserId,
    );
    const res = await this.db.execute({
      sql: `
        SELECT e.*, 0 AS routine_count
        FROM exercises e
        WHERE e.user_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM routine_items ri
            JOIN routines r ON r.id = ri.routine_id
            WHERE ri.exercise_id = e.id AND r.user_id = ?
          )
        ORDER BY e.created_at DESC
      `,
      args: [actingUserId, actingUserId],
    });
    return res.rows.map(mapExerciseWithCount);
  }

  async listManual(
    actorUserId: string,
    actorRole: UserRole,
    actingUserId: string,
  ): Promise<Exercise[]> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      actingUserId,
    );
    const res = await this.db.execute({
      sql: `SELECT * FROM exercises
            WHERE user_id = ? AND source = 'manual'
            ORDER BY created_at DESC`,
      args: [actingUserId],
    });
    return res.rows.map(mapExercise);
  }

  async listImported(
    actorUserId: string,
    actorRole: UserRole,
    actingUserId: string,
  ): Promise<Exercise[]> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      actingUserId,
    );
    const res = await this.db.execute({
      sql: `SELECT * FROM exercises
            WHERE user_id = ? AND source = 'ai_import'
            ORDER BY created_at DESC`,
      args: [actingUserId],
    });
    return res.rows.map(mapExercise);
  }

  async findOne(
    actorUserId: string,
    actorRole: UserRole,
    id: string,
  ): Promise<Exercise> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM exercises WHERE id = ?',
      args: [id],
    });
    const row = res.rows[0];
    if (!row) throw new NotFoundException('Ejercicio no encontrado');
    const ex = mapExercise(row);
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      ex.userId,
    );
    return ex;
  }

  async create(
    actorUserId: string,
    actorRole: UserRole,
    targetUserId: string,
    dto: CreateExerciseDto,
    source: ExerciseSource = 'manual',
  ): Promise<Exercise> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      targetUserId,
    );
    const id = uuid();
    await this.db.execute({
      sql: `INSERT INTO exercises
        (id, user_id, name, type, sets, duration_per_set_sec, reps_per_set, rest_sec, notes, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        targetUserId,
        dto.name,
        dto.type,
        dto.sets,
        dto.durationPerSetSec ?? null,
        dto.repsPerSet ?? null,
        dto.restSec ?? 0,
        dto.notes ?? null,
        source,
      ],
    });
    const ex = await this.db.execute({
      sql: 'SELECT * FROM exercises WHERE id = ?',
      args: [id],
    });
    return mapExercise(ex.rows[0]);
  }

  async update(
    actorUserId: string,
    actorRole: UserRole,
    id: string,
    dto: UpdateExerciseDto,
  ): Promise<Exercise> {
    const existing = await this.findOne(actorUserId, actorRole, id);
    const merged: Exercise = {
      ...existing,
      ...dto,
    } as Exercise;
    await this.db.execute({
      sql: `UPDATE exercises SET
        name = ?, type = ?, sets = ?, duration_per_set_sec = ?,
        reps_per_set = ?, rest_sec = ?, notes = ?,
        updated_at = datetime('now')
        WHERE id = ?`,
      args: [
        merged.name,
        merged.type,
        merged.sets,
        merged.durationPerSetSec,
        merged.repsPerSet,
        merged.restSec,
        merged.notes,
        id,
      ],
    });
    return this.findOne(actorUserId, actorRole, id);
  }

  async remove(
    actorUserId: string,
    actorRole: UserRole,
    id: string,
  ): Promise<void> {
    await this.findOne(actorUserId, actorRole, id);
    await this.db.execute({
      sql: 'DELETE FROM exercises WHERE id = ?',
      args: [id],
    });
  }
}

function mapExercise(row: any): Exercise {
  const source: ExerciseSource =
    row.source === 'ai_import' ? 'ai_import' : 'manual';
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    type: row.type as ExerciseType,
    sets: Number(row.sets),
    durationPerSetSec:
      row.duration_per_set_sec == null
        ? null
        : Number(row.duration_per_set_sec),
    repsPerSet: row.reps_per_set == null ? null : Number(row.reps_per_set),
    restSec: Number(row.rest_sec),
    notes: row.notes == null ? null : String(row.notes),
    source,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapExerciseWithCount(row: any): ExerciseWithRoutineCount {
  return {
    ...mapExercise(row),
    routineCount: Number(row.routine_count ?? 0),
  };
}