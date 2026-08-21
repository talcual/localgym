import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Client } from '@libsql/client';
import { v4 as uuid } from 'uuid';
import { randomBytes } from 'crypto';

import { DATABASE } from '../../database/database.tokens';
import {
  InstructorClient,
  InstructorInvitation,
  UserRole,
} from '../../database/types';
import { InviteClientDto } from './dto/invite-client.dto';
import { UsersService } from '../users/users.service';

const INVITATION_TTL_DAYS = 14;

/**
 * Servicio principal del área de instructores: gestiona invitaciones y la
 * relación activa instructor↔cliente. La regla de "un instructor activo por
 * cliente" se enforza a nivel aplicación (ver `assertCanActAsInstructor`).
 */
@Injectable()
export class InstructorsService {
  constructor(
    @Inject(DATABASE) private readonly db: Client,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Verifica que el actor pueda actuar sobre el cliente target. Lanza 403
   * si no es él mismo o no es un instructor con relación ACTIVE.
   *
   * Usado por `@CanAccessClient()` y por servicios que aceptan `actorUserId`.
   */
  async assertCanAccessClient(
    actorUserId: string,
    actorRole: UserRole,
    clientId: string,
  ): Promise<void> {
    if (actorUserId === clientId) return;
    if (actorRole !== 'INSTRUCTOR' && actorRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo puedes acceder a tus propios datos',
      );
    }
    const relation = await this.findActiveRelation(actorUserId, clientId);
    if (!relation) {
      throw new ForbiddenException(
        'No tienes una relación activa con este cliente',
      );
    }
  }

  private async findActiveRelation(
    instructorId: string,
    clientId: string,
  ): Promise<InstructorClient | null> {
    const res = await this.db.execute({
      sql: `SELECT * FROM instructor_clients
            WHERE instructor_id = ? AND client_id = ? AND status = 'ACTIVE'
            LIMIT 1`,
      args: [instructorId, clientId],
    });
    const row = res.rows[0];
    return row ? mapInstructorClient(row) : null;
  }

  async invite(
    instructorId: string,
    dto: InviteClientDto,
  ): Promise<InstructorInvitation> {
    const kind = dto.kind ?? 'EMAIL';

    // Si el email ya corresponde a un cliente con instructor activo, rechaza.
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      if (existing.role === 'INSTRUCTOR' || existing.role === 'ADMIN') {
        throw new ConflictException(
          'Ese email corresponde a un instructor, no puede ser tu cliente',
        );
      }
      const active = await this.findActiveRelation(instructorId, existing.id);
      if (active) {
        throw new ConflictException(
          'Este cliente ya es tu cliente activo',
        );
      }
    }

    const id = uuid();
    const token = randomBytes(24).toString('hex');
    const expires = new Date(
      Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    await this.db.execute({
      sql: `INSERT INTO instructor_invitations
            (id, instructor_id, client_email, token, kind, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, instructorId, dto.email, token, kind, expires],
    });

    const created = await this.findInvitationById(id);
    if (!created) throw new Error('Error al crear invitación');
    return created;
  }

  async listPendingInvitations(
    instructorId: string,
  ): Promise<InstructorInvitation[]> {
    const res = await this.db.execute({
      sql: `SELECT * FROM instructor_invitations
            WHERE instructor_id = ? AND accepted_at IS NULL
            ORDER BY created_at DESC`,
      args: [instructorId],
    });
    return res.rows.map(mapInstructorInvitation);
  }

  async findInvitationByToken(token: string): Promise<InstructorInvitation | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM instructor_invitations WHERE token = ? LIMIT 1',
      args: [token],
    });
    const row = res.rows[0];
    return row ? mapInstructorInvitation(row) : null;
  }

  private async findInvitationById(id: string): Promise<InstructorInvitation | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM instructor_invitations WHERE id = ? LIMIT 1',
      args: [id],
    });
    const row = res.rows[0];
    return row ? mapInstructorInvitation(row) : null;
  }

  /**
   * El cliente autenticado acepta la invitación identificada por token.
   * Activa la relación y marca la invitación como aceptada.
   */
  async acceptInvitation(
    clientUserId: string,
    token: string,
  ): Promise<InstructorClient> {
    const inv = await this.findInvitationByToken(token);
    if (!inv) throw new NotFoundException('Invitación no encontrada');
    if (inv.acceptedAt) {
      throw new ConflictException('Esta invitación ya fue aceptada');
    }
    if (new Date(inv.expiresAt).getTime() < Date.now()) {
      throw new ConflictException('La invitación ha expirado');
    }
    // Confirma que el email del cliente autenticado coincide con el invitado.
    const user = await this.usersService.findById(clientUserId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.email.toLowerCase() !== inv.clientEmail.toLowerCase()) {
      throw new ForbiddenException(
        'Esta invitación es para otro email',
      );
    }
    if (user.role === 'INSTRUCTOR' || user.role === 'ADMIN') {
      throw new ConflictException(
        'Un instructor no puede ser cliente de otro instructor',
      );
    }

    // Si ya tiene instructor activo, revoca el anterior antes de activar el nuevo.
    await this.db.execute({
      sql: `UPDATE instructor_clients
            SET status = 'REVOKED'
            WHERE client_id = ? AND status = 'ACTIVE'`,
      args: [clientUserId],
    });

    const id = uuid();
    await this.db.batch(
      [
        {
          sql: `INSERT INTO instructor_clients
                (id, instructor_id, client_id, status, accepted_at)
                VALUES (?, ?, ?, 'ACTIVE', datetime('now'))`,
          args: [id, inv.instructorId, clientUserId],
        },
        {
          sql: `UPDATE instructor_invitations
                SET accepted_at = datetime('now')
                WHERE id = ?`,
          args: [inv.id],
        },
      ],
      'write',
    );

    const relation = await this.findActiveRelation(inv.instructorId, clientUserId);
    if (!relation) throw new Error('Error al activar la relación');
    return relation;
  }

  async revokeInstructor(
    instructorUserId: string,
    clientId: string,
  ): Promise<void> {
    await this.db.execute({
      sql: `UPDATE instructor_clients
            SET status = 'REVOKED'
            WHERE instructor_id = ? AND client_id = ? AND status = 'ACTIVE'`,
      args: [instructorUserId, clientId],
    });
  }

  async listClients(instructorUserId: string): Promise<InstructorClient[]> {
    const res = await this.db.execute({
      sql: `SELECT * FROM instructor_clients
            WHERE instructor_id = ?
            ORDER BY created_at DESC`,
      args: [instructorUserId],
    });
    return res.rows.map(mapInstructorClient);
  }

  /**
   * Lista las invitaciones pendientes para el cliente autenticado (por email).
   */
  async listPendingForClient(clientEmail: string): Promise<InstructorInvitation[]> {
    const res = await this.db.execute({
      sql: `SELECT * FROM instructor_invitations
            WHERE client_email = ? AND accepted_at IS NULL
              AND expires_at > datetime('now')
            ORDER BY created_at DESC`,
      args: [clientEmail],
    });
    return res.rows.map(mapInstructorInvitation);
  }

  async getActiveInstructorFor(
    clientId: string,
  ): Promise<InstructorClient | null> {
    const res = await this.db.execute({
      sql: `SELECT * FROM instructor_clients
            WHERE client_id = ? AND status = 'ACTIVE'
            LIMIT 1`,
      args: [clientId],
    });
    const row = res.rows[0];
    return row ? mapInstructorClient(row) : null;
  }
}

function mapInstructorClient(row: any): InstructorClient {
  return {
    id: String(row.id),
    instructorId: String(row.instructor_id),
    clientId: String(row.client_id),
    status: row.status as InstructorClient['status'],
    invitedAt: String(row.invited_at),
    acceptedAt: row.accepted_at == null ? null : String(row.accepted_at),
    createdAt: String(row.created_at),
  };
}

function mapInstructorInvitation(row: any): InstructorInvitation {
  return {
    id: String(row.id),
    instructorId: String(row.instructor_id),
    clientEmail: String(row.client_email),
    token: String(row.token),
    kind: row.kind as InstructorInvitation['kind'],
    expiresAt: String(row.expires_at),
    acceptedAt: row.accepted_at == null ? null : String(row.accepted_at),
    createdAt: String(row.created_at),
  };
}