import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Client } from '@libsql/client';
import { v4 as uuid } from 'uuid';

import { DATABASE } from '../../database/database.tokens';
import { Exercise, ExerciseType } from '../../database/types';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(@Inject(DATABASE) private readonly db: Client) {}

  async list(userId: string): Promise<Exercise[]> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM exercises WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    });
    return res.rows.map(mapExercise);
  }

  async findOne(userId: string, id: string): Promise<Exercise> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM exercises WHERE id = ?',
      args: [id],
    });
    const row = res.rows[0];
    if (!row) throw new NotFoundException('Ejercicio no encontrado');
    const ex = mapExercise(row);
    if (ex.userId !== userId)
      throw new ForbiddenException('No autorizado');
    return ex;
  }

  async create(userId: string, dto: CreateExerciseDto): Promise<Exercise> {
    const id = uuid();
    await this.db.execute({
      sql: `INSERT INTO exercises
        (id, user_id, name, type, sets, duration_per_set_sec, reps_per_set, rest_sec, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        userId,
        dto.name,
        dto.type,
        dto.sets,
        dto.durationPerSetSec ?? null,
        dto.repsPerSet ?? null,
        dto.restSec ?? 0,
        dto.notes ?? null,
      ],
    });
    const ex = await this.db.execute({
      sql: 'SELECT * FROM exercises WHERE id = ?',
      args: [id],
    });
    return mapExercise(ex.rows[0]);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateExerciseDto,
  ): Promise<Exercise> {
    const existing = await this.findOne(userId, id);
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
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.db.execute({
      sql: 'DELETE FROM exercises WHERE id = ?',
      args: [id],
    });
  }
}

function mapExercise(row: any): Exercise {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    type: row.type as ExerciseType,
    sets: Number(row.sets),
    durationPerSetSec: row.duration_per_set_sec == null
      ? null
      : Number(row.duration_per_set_sec),
    repsPerSet: row.reps_per_set == null ? null : Number(row.reps_per_set),
    restSec: Number(row.rest_sec),
    notes: row.notes == null ? null : String(row.notes),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
