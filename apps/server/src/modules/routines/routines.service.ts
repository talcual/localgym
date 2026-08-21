import {
  BadRequestException,
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
  UserRole,
} from '../../database/types';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { ReplaceItemsDto } from './dto/replace-items.dto';
import { InstructorsService } from '../instructors/instructors.service';
import { RoutineAssignmentsService } from '../routine-assignments/routine-assignments.service';

/**
 * Servicio de rutinas.
 *
 * Modelo de permisos:
 *  - Cliente actúa sobre sí mismo: comportamiento histórico, salvo que la
 *    rutina tenga una asignación ACTIVE vigente → en ese caso 403.
 *  - Instructor con relación ACTIVE sobre el cliente: puede leer todo y
 *    escribir solo rutinas donde `written_by_instructor_id` coincide con
 *    su id.
 *  - Admin: pasa todos los checks.
 */
@Injectable()
export class RoutinesService {
  constructor(
    @Inject(DATABASE) private readonly db: Client,
    private readonly instructorsService: InstructorsService,
    private readonly assignmentsService: RoutineAssignmentsService,
  ) {}

  async list(
    actorUserId: string,
    actorRole: UserRole,
    actingUserId: string,
  ): Promise<RoutineWithItems[]> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      actingUserId,
    );
    const routinesRes = await this.db.execute({
      sql: 'SELECT * FROM routines WHERE user_id = ? ORDER BY created_at DESC',
      args: [actingUserId],
    });
    const routines = routinesRes.rows.map((r) => mapRoutine(r));
    if (routines.length === 0) return [];
    const withItems = await this.attachItems(routines);
    return this.attachAssignmentMetadata(withItems);
  }

  async findOne(
    actorUserId: string,
    actorRole: UserRole,
    id: string,
  ): Promise<RoutineWithItems> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM routines WHERE id = ?',
      args: [id],
    });
    const row = res.rows[0];
    if (!row) throw new NotFoundException('Rutina no encontrada');
    const routine = mapRoutine(row);
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      routine.userId,
    );
    const [withItems] = await this.attachItems([routine]);
    const [withMeta] = await this.attachAssignmentMetadata([withItems]);
    return withMeta;
  }

  async getActive(
    actorUserId: string,
    actorRole: UserRole,
    actingUserId: string,
  ): Promise<RoutineWithItems | null> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      actingUserId,
    );
    const assignment = await this.assignmentsService.getActiveForClient(
      actingUserId,
    );
    if (assignment) {
      const routine = await this.findOneInner(assignment.routineId);
      if (routine) {
        const [withItems] = await this.attachItems([routine]);
        const [withMeta] = await this.attachAssignmentMetadata([withItems]);
        return withMeta;
      }
    }
    const res = await this.db.execute({
      sql: 'SELECT * FROM routines WHERE user_id = ? AND is_active = 1 LIMIT 1',
      args: [actingUserId],
    });
    const row = res.rows[0];
    if (!row) return null;
    const routine = mapRoutine(row);
    const [withItems] = await this.attachItems([routine]);
    const [withMeta] = await this.attachAssignmentMetadata([withItems]);
    return withMeta;
  }

  private async findOneInner(id: string): Promise<Routine | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM routines WHERE id = ? LIMIT 1',
      args: [id],
    });
    const row = res.rows[0];
    return row ? mapRoutine(row) : null;
  }

  async create(
    actorUserId: string,
    actorRole: UserRole,
    targetUserId: string,
    dto: CreateRoutineDto,
  ): Promise<RoutineWithItems> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      targetUserId,
    );
    const writtenByInstructorId =
      targetUserId !== actorUserId ? actorUserId : null;

    const id = uuid();
    await this.db.execute({
      sql: `INSERT INTO routines
        (id, user_id, title, goal, level, days_per_week, is_active, summary, written_by_instructor_id)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      args: [
        id,
        targetUserId,
        dto.title,
        dto.goal,
        dto.level,
        dto.daysPerWeek,
        dto.summary ?? null,
        writtenByInstructorId,
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

    return this.findOne(actorUserId, actorRole, id);
  }

  async update(
    actorUserId: string,
    actorRole: UserRole,
    id: string,
    dto: UpdateRoutineDto,
  ): Promise<RoutineWithItems> {
    const existing = await this.findOne(actorUserId, actorRole, id);
    await this.assertCanEditRoutine(actorUserId, actorRole, existing);

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
    return this.findOne(actorUserId, actorRole, id);
  }

  async replaceItems(
    actorUserId: string,
    actorRole: UserRole,
    id: string,
    dto: ReplaceItemsDto,
  ): Promise<RoutineWithItems> {
    const existing = await this.findOne(actorUserId, actorRole, id);
    await this.assertCanEditRoutine(actorUserId, actorRole, existing);

    if (dto.items.length < 3) {
      throw new BadRequestException(
        'La rutina debe tener al menos 3 ejercicios',
      );
    }

    const stmts: any[] = [
      { sql: 'DELETE FROM routine_items WHERE routine_id = ?', args: [id] },
    ];
    for (let i = 0; i < dto.items.length; i++) {
      const it = dto.items[i];
      stmts.push({
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
    stmts.push({
      sql: `UPDATE routines SET updated_at = datetime('now') WHERE id = ?`,
      args: [id],
    });
    await this.db.batch(stmts, 'write');

    return this.findOne(actorUserId, actorRole, id);
  }

  async activate(
    actorUserId: string,
    actorRole: UserRole,
    id: string,
  ): Promise<RoutineWithItems> {
    const existing = await this.findOne(actorUserId, actorRole, id);
    await this.assertCanEditRoutine(actorUserId, actorRole, existing);
    await this.db.batch(
      [
        {
          sql: `UPDATE routines SET is_active = 0, updated_at = datetime('now') WHERE user_id = ?`,
          args: [existing.userId],
        },
        {
          sql: `UPDATE routines SET is_active = 1, updated_at = datetime('now') WHERE id = ?`,
          args: [id],
        },
      ],
      'write',
    );
    return this.findOne(actorUserId, actorRole, id);
  }

  async deactivate(
    actorUserId: string,
    actorRole: UserRole,
    actingUserId: string,
  ): Promise<{ ok: true }> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      actingUserId,
    );
    await this.db.execute({
      sql: `UPDATE routines SET is_active = 0, updated_at = datetime('now')
            WHERE user_id = ? AND is_active = 1`,
      args: [actingUserId],
    });
    return { ok: true };
  }

  async remove(
    actorUserId: string,
    actorRole: UserRole,
    id: string,
  ): Promise<void> {
    const existing = await this.findOne(actorUserId, actorRole, id);
    await this.assertCanEditRoutine(actorUserId, actorRole, existing);
    await this.db.execute({
      sql: 'DELETE FROM routines WHERE id = ?',
      args: [id],
    });
  }

  // ──────────────────────────────────────────────────────────────────────

  private async assertCanEditRoutine(
    actorUserId: string,
    actorRole: UserRole,
    routine: RoutineWithItems,
  ): Promise<void> {
    if (actorRole === 'ADMIN') return;
    const isOwner = routine.userId === actorUserId;
    const assignment = await this.assignmentsService.getActiveForRoutine(
      routine.id,
    );

    if (isOwner) {
      if (assignment) {
        throw new ForbiddenException(
          'Esta rutina es de tu instructor, no puedes editarla',
        );
      }
      return;
    }
    if (
      routine.writtenByInstructorId &&
      routine.writtenByInstructorId === actorUserId
    ) {
      return;
    }
    throw new ForbiddenException(
      'No autorizado para editar esta rutina',
    );
  }

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
    return routines.map((r) => ({
      ...r,
      writtenByInstructorId: r.writtenByInstructorId,
      items: itemsByRoutine.get(r.id) ?? [],
    }));
  }

  private async attachAssignmentMetadata(
    routines: RoutineWithItems[],
  ): Promise<RoutineWithItems[]> {
    if (routines.length === 0) return routines;
    const ids = routines.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const res = await this.db.execute({
      sql: `SELECT ra.*, u.display_name as instructor_name
            FROM routine_assignments ra
            LEFT JOIN users u ON u.id = ra.instructor_id
            WHERE ra.routine_id IN (${placeholders})
              AND ra.status = 'ACTIVE'
              AND date('now') >= ra.start_date
              AND (ra.end_date IS NULL OR date('now') <= ra.end_date)`,
      args: ids,
    });
    const byRoutine = new Map<string, any>();
    for (const row of res.rows) {
      byRoutine.set(String(row.routine_id), row);
    }
    return routines.map((r) => {
      const a = byRoutine.get(r.id);
      if (!a) return r;
      return {
        ...r,
        assignedByInstructor: true,
        assignedInstructorId: String(a.instructor_id),
        assignedInstructorName: a.instructor_name
          ? String(a.instructor_name)
          : null,
        assignmentWindow: {
          startDate: String(a.start_date),
          endDate: a.end_date == null ? null : String(a.end_date),
        },
      };
    });
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
    writtenByInstructorId:
      row.written_by_instructor_id == null
        ? null
        : String(row.written_by_instructor_id),
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