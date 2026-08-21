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
  RoutineAssignment,
  RoutineAssignmentWithRoutine,
  RoutineAssignmentStatus,
  UserRole,
} from '../../database/types';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { InstructorsService } from '../instructors/instructors.service';

@Injectable()
export class RoutineAssignmentsService {
  constructor(
    @Inject(DATABASE) private readonly db: Client,
    private readonly instructorsService: InstructorsService,
  ) {}

  async create(
    actorUserId: string,
    actorRole: UserRole,
    dto: CreateAssignmentDto,
  ): Promise<RoutineAssignment> {
    // Solo instructores pueden crear asignaciones.
    if (actorRole !== 'INSTRUCTOR' && actorRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo instructores pueden asignar rutinas',
      );
    }
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      dto.clientId,
    );

    // Verificar que la rutina existe y pertenece al cliente.
    const routineRes = await this.db.execute({
      sql: 'SELECT * FROM routines WHERE id = ? LIMIT 1',
      args: [dto.routineId],
    });
    const routineRow = routineRes.rows[0];
    if (!routineRow) throw new NotFoundException('Rutina no encontrada');
    if (String(routineRow.user_id) !== dto.clientId) {
      throw new BadRequestException(
        'La rutina debe pertenecer al cliente destino',
      );
    }
    // El instructor que asigna debe ser quien escribió la rutina.
    const writtenBy = routineRow.written_by_instructor_id as string | null;
    if (writtenBy && writtenBy !== actorUserId && actorRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo el instructor que escribió la rutina puede asignarla',
      );
    }

    const id = uuid();
    await this.db.execute({
      sql: `INSERT INTO routine_assignments
            (id, routine_id, client_id, instructor_id, start_date, end_date, status)
            VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      args: [
        id,
        dto.routineId,
        dto.clientId,
        actorUserId,
        dto.startDate,
        dto.endDate ?? null,
      ],
    });

    // Archivamos cualquier otra asignación activa para esta misma rutina.
    await this.db.execute({
      sql: `UPDATE routine_assignments
            SET status = 'ARCHIVED'
            WHERE routine_id = ? AND status = 'ACTIVE' AND id <> ?`,
      args: [dto.routineId, id],
    });

    const created = await this.findById(id);
    if (!created) throw new Error('Error al crear asignación');
    return created;
  }

  async listForClient(
    actorUserId: string,
    actorRole: UserRole,
    clientId: string,
  ): Promise<RoutineAssignment[]> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      clientId,
    );
    const res = await this.db.execute({
      sql: `SELECT * FROM routine_assignments
            WHERE client_id = ?
            ORDER BY created_at DESC`,
      args: [clientId],
    });
    return res.rows.map(mapAssignment);
  }

  async listForRoutine(
    actorUserId: string,
    actorRole: UserRole,
    routineId: string,
  ): Promise<RoutineAssignment[]> {
    const res = await this.db.execute({
      sql: `SELECT * FROM routine_assignments WHERE routine_id = ? ORDER BY created_at DESC`,
      args: [routineId],
    });
    const list = res.rows.map(mapAssignment);
    if (list.length === 0) return list;
    // El cliente debe ser dueño de la rutina o un instructor con acceso.
    const first = list[0];
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      first.clientId,
    );
    return list;
  }

  async getActiveForRoutine(routineId: string): Promise<RoutineAssignment | null> {
    const res = await this.db.execute({
      sql: `SELECT * FROM routine_assignments
            WHERE routine_id = ? AND status = 'ACTIVE'
            LIMIT 1`,
      args: [routineId],
    });
    const row = res.rows[0];
    return row ? mapAssignment(row) : null;
  }

  async getActiveForClient(clientId: string): Promise<RoutineAssignment | null> {
    const res = await this.db.execute({
      sql: `SELECT * FROM routine_assignments
            WHERE client_id = ? AND status = 'ACTIVE'
              AND date('now') >= start_date
              AND (end_date IS NULL OR date('now') <= end_date)
            ORDER BY start_date DESC
            LIMIT 1`,
      args: [clientId],
    });
    const row = res.rows[0];
    return row ? mapAssignment(row) : null;
  }

  async archive(
    actorUserId: string,
    actorRole: UserRole,
    assignmentId: string,
  ): Promise<void> {
    const found = await this.findById(assignmentId);
    if (!found) throw new NotFoundException('Asignación no encontrada');
    if (
      actorRole !== 'ADMIN' &&
      found.instructorId !== actorUserId &&
      found.clientId !== actorUserId
    ) {
      throw new ForbiddenException('No autorizado');
    }
    await this.db.execute({
      sql: `UPDATE routine_assignments SET status = 'ARCHIVED' WHERE id = ?`,
      args: [assignmentId],
    });
  }

  private async findById(id: string): Promise<RoutineAssignment | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM routine_assignments WHERE id = ? LIMIT 1',
      args: [id],
    });
    const row = res.rows[0];
    return row ? mapAssignment(row) : null;
  }
}

function mapAssignment(row: any): RoutineAssignment {
  return {
    id: String(row.id),
    routineId: String(row.routine_id),
    clientId: String(row.client_id),
    instructorId: String(row.instructor_id),
    startDate: String(row.start_date),
    endDate: row.end_date == null ? null : String(row.end_date),
    status: row.status as RoutineAssignmentStatus,
    createdAt: String(row.created_at),
  };
}