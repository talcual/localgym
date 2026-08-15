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
  Routine,
  RoutineGoal,
  RoutineItem,
  RoutineLevel,
  RoutineWithItems,
} from '../../database/types';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';

@Injectable()
export class RoutinesService {
  constructor(@Inject(DATABASE) private readonly db: Client) {}

  async list(userId: string): Promise<RoutineWithItems[]> {
    const routinesRes = await this.db.execute({
      sql: 'SELECT * FROM routines WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    });
    const routines = routinesRes.rows.map((r) => mapRoutine(r));
    if (routines.length === 0) return [];
    return this.attachItems(routines);
  }

  async findOne(userId: string, id: string): Promise<RoutineWithItems> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM routines WHERE id = ?',
      args: [id],
    });
    const row = res.rows[0];
    if (!row) throw new NotFoundException('Rutina no encontrada');
    const routine = mapRoutine(row);
    if (routine.userId !== userId)
      throw new ForbiddenException('No autorizado');
    const [withItems] = await this.attachItems([routine]);
    return withItems;
  }

  async getActive(userId: string): Promise<RoutineWithItems | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM routines WHERE user_id = ? AND is_active = 1 LIMIT 1',
      args: [userId],
    });
    const row = res.rows[0];
    if (!row) return null;
    const routine = mapRoutine(row);
    const [withItems] = await this.attachItems([routine]);
    return withItems;
  }

  async create(
    userId: string,
    dto: CreateRoutineDto,
  ): Promise<RoutineWithItems> {
    const id = uuid();
    await this.db.execute({
      sql: `INSERT INTO routines
        (id, user_id, title, goal, level, days_per_week, is_active, summary)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      args: [
        id,
        userId,
        dto.title,
        dto.goal,
        dto.level,
        dto.daysPerWeek,
        dto.summary ?? null,
      ],
    });

    for (let i = 0; i < dto.items.length; i++) {
      const it = dto.items[i];
      await this.db.execute({
        sql: `INSERT INTO routine_items
          (id, routine_id, day_index, day_label, position,
           exercise_id, catalog_id, sets, reps, duration_per_set_sec, rest_sec, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          uuid(),
          id,
          it.dayIndex,
          it.dayLabel,
          i,
          it.exerciseId ?? null,
          it.catalogId ?? null,
          it.sets ?? null,
          it.reps ?? null,
          it.durationPerSetSec ?? null,
          it.restSec ?? null,
          it.notes ?? null,
        ],
      });
    }

    return this.findOne(userId, id);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateRoutineDto,
  ): Promise<RoutineWithItems> {
    const existing = await this.findOne(userId, id);
    const merged: Routine = {
      ...existing,
      title: dto.title ?? existing.title,
      goal: (dto.goal ?? existing.goal) as RoutineGoal,
      level: (dto.level ?? existing.level) as RoutineLevel,
      daysPerWeek: dto.daysPerWeek ?? existing.daysPerWeek,
      summary: dto.summary ?? existing.summary,
    };
    await this.db.execute({
      sql: `UPDATE routines SET
        title = ?, goal = ?, level = ?, days_per_week = ?, summary = ?,
        updated_at = datetime('now')
        WHERE id = ?`,
      args: [
        merged.title,
        merged.goal,
        merged.level,
        merged.daysPerWeek,
        merged.summary,
        id,
      ],
    });
    return this.findOne(userId, id);
  }

  /**
   * Activa la rutina indicada y desactiva todas las demás del usuario.
   * Sólo puede haber una rutina activa por usuario.
   */
  async activate(userId: string, id: string): Promise<RoutineWithItems> {
    const routine = await this.findOne(userId, id);
    await this.db.batch(
      [
        {
          sql: 'UPDATE routines SET is_active = 0, updated_at = datetime(\'now\') WHERE user_id = ?',
          args: [userId],
        },
        {
          sql: 'UPDATE routines SET is_active = 1, updated_at = datetime(\'now\') WHERE id = ?',
          args: [id],
        },
      ],
      'write',
    );
    const refreshed = await this.findOne(userId, id);
    void routine; // silenciar noUnused
    return refreshed;
  }

  /** Desactiva cualquier rutina activa del usuario (sin borrarla). */
  async deactivate(userId: string): Promise<{ ok: true }> {
    await this.db.execute({
      sql: 'UPDATE routines SET is_active = 0, updated_at = datetime(\'now\') WHERE user_id = ? AND is_active = 1',
      args: [userId],
    });
    return { ok: true };
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.db.execute({
      sql: 'DELETE FROM routines WHERE id = ?',
      args: [id],
    });
  }

  // ──────────────────────────────────────────────────────────────────────

  private async attachItems(
    routines: Routine[],
  ): Promise<RoutineWithItems[]> {
    if (routines.length === 0) return [];
    const ids = routines.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const itemsRes = await this.db.execute({
      sql: `SELECT * FROM routine_items
            WHERE routine_id IN (${placeholders})
            ORDER BY routine_id, day_index, position`,
      args: ids,
    });
    const itemsByRoutine = new Map<string, RoutineItem[]>();
    for (const row of itemsRes.rows) {
      const item = mapItem(row);
      const arr = itemsByRoutine.get(item.routineId) ?? [];
      arr.push(item);
      itemsByRoutine.set(item.routineId, arr);
    }
    return routines.map((r) => ({ ...r, items: itemsByRoutine.get(r.id) ?? [] }));
  }
}

function mapRoutine(row: any): Routine {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    goal: row.goal as RoutineGoal,
    level: row.level as RoutineLevel,
    daysPerWeek: Number(row.days_per_week),
    isActive: Number(row.is_active) === 1,
    summary: row.summary == null ? null : String(row.summary),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapItem(row: any): RoutineItem {
  const numOrNull = (v: any) => (v == null ? null : Number(v));
  return {
    id: String(row.id),
    routineId: String(row.routine_id),
    dayIndex: Number(row.day_index),
    dayLabel: String(row.day_label),
    position: Number(row.position),
    exerciseId: row.exercise_id == null ? null : String(row.exercise_id),
    catalogId: row.catalog_id == null ? null : String(row.catalog_id),
    sets: numOrNull(row.sets),
    reps: numOrNull(row.reps),
    durationPerSetSec: numOrNull(row.duration_per_set_sec),
    restSec: numOrNull(row.rest_sec),
    notes: row.notes == null ? null : String(row.notes),
  };
}
