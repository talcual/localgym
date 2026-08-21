import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Client } from '@libsql/client';
import { v4 as uuid } from 'uuid';

import { DATABASE } from '../../database/database.tokens';
import { Message, MessageThread } from '../../database/types';
import { SendMessageDto } from './dto/send-message.dto';
import { InstructorsService } from '../instructors/instructors.service';

@Injectable()
export class MessagesService {
  constructor(
    @Inject(DATABASE) private readonly db: Client,
    private readonly instructorsService: InstructorsService,
  ) {}

  /**
   * Verifica que actor y target tengan relación instructor↔cliente activa
   * en cualquier dirección. Si no, 403.
   */
  private async assertCanMessage(
    actorUserId: string,
    otherUserId: string,
  ): Promise<void> {
    const res = await this.db.execute({
      sql: `SELECT 1 FROM instructor_clients
            WHERE status = 'ACTIVE'
              AND (
                (instructor_id = ? AND client_id = ?)
                OR (instructor_id = ? AND client_id = ?)
              )
            LIMIT 1`,
      args: [actorUserId, otherUserId, otherUserId, actorUserId],
    });
    if (res.rows.length === 0) {
      throw new ForbiddenException(
        'Solo puedes mensajear con tu instructor o cliente activo',
      );
    }
  }

  async send(
    actorUserId: string,
    dto: SendMessageDto,
  ): Promise<Message> {
    await this.assertCanMessage(actorUserId, dto.toUserId);
    const id = uuid();
    await this.db.execute({
      sql: `INSERT INTO messages (id, sender_id, recipient_id, body)
            VALUES (?, ?, ?, ?)`,
      args: [id, actorUserId, dto.toUserId, dto.body],
    });
    const created = await this.findById(id);
    if (!created) throw new Error('Error al enviar mensaje');
    return created;
  }

  async listThreads(actorUserId: string): Promise<MessageThread[]> {
    // Selecciona la conversación más reciente con cada usuario distinto.
    const res = await this.db.execute({
      sql: `
        WITH partners AS (
          SELECT CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END as partner_id
          FROM messages
          WHERE sender_id = ? OR recipient_id = ?
        ),
        distinct_partners AS (
          SELECT DISTINCT partner_id FROM partners
        )
        SELECT
          dp.partner_id,
          u.display_name,
          u.email,
          (SELECT body FROM messages
            WHERE (sender_id = ? AND recipient_id = dp.partner_id)
               OR (sender_id = dp.partner_id AND recipient_id = ?)
            ORDER BY created_at DESC LIMIT 1) as last_body,
          (SELECT created_at FROM messages
            WHERE (sender_id = ? AND recipient_id = dp.partner_id)
               OR (sender_id = dp.partner_id AND recipient_id = ?)
            ORDER BY created_at DESC LIMIT 1) as last_at,
          (SELECT id FROM messages
            WHERE (sender_id = ? AND recipient_id = dp.partner_id)
               OR (sender_id = dp.partner_id AND recipient_id = ?)
            ORDER BY created_at DESC LIMIT 1) as last_id,
          (SELECT sender_id FROM messages
            WHERE (sender_id = ? AND recipient_id = dp.partner_id)
               OR (sender_id = dp.partner_id AND recipient_id = ?)
            ORDER BY created_at DESC LIMIT 1) as last_sender,
          (SELECT read_at FROM messages
            WHERE (sender_id = ? AND recipient_id = dp.partner_id)
               OR (sender_id = dp.partner_id AND recipient_id = ?)
            ORDER BY created_at DESC LIMIT 1) as last_read_at,
          (SELECT COUNT(*) FROM messages
            WHERE recipient_id = ? AND sender_id = dp.partner_id AND read_at IS NULL) as unread_count
        FROM distinct_partners dp
        LEFT JOIN users u ON u.id = dp.partner_id
        ORDER BY last_at DESC
      `,
      args: [
        actorUserId, actorUserId, actorUserId,
        actorUserId, actorUserId,
        actorUserId, actorUserId,
        actorUserId, actorUserId,
        actorUserId, actorUserId,
        actorUserId, actorUserId,
        actorUserId,
      ],
    });

    return res.rows.map((row: any) => ({
      userId: String(row.partner_id),
      displayName: row.display_name ? String(row.display_name) : 'Sin nombre',
      email: row.email ? String(row.email) : '',
      lastMessage: {
        id: String(row.last_id),
        senderId: String(row.last_sender),
        recipientId: actorUserId,
        body: String(row.last_body ?? ''),
        createdAt: String(row.last_at),
        readAt: row.last_read_at == null ? null : String(row.last_read_at),
      },
      unreadCount: Number(row.unread_count ?? 0),
    }));
  }

  async listWith(
    actorUserId: string,
    otherUserId: string,
  ): Promise<Message[]> {
    await this.assertCanMessage(actorUserId, otherUserId);
    const res = await this.db.execute({
      sql: `SELECT * FROM messages
            WHERE (sender_id = ? AND recipient_id = ?)
               OR (sender_id = ? AND recipient_id = ?)
            ORDER BY created_at ASC
            LIMIT 500`,
      args: [actorUserId, otherUserId, otherUserId, actorUserId],
    });
    return res.rows.map(mapMessage);
  }

  async markRead(actorUserId: string, otherUserId: string): Promise<{ updated: number }> {
    await this.assertCanMessage(actorUserId, otherUserId);
    const res = await this.db.execute({
      sql: `UPDATE messages SET read_at = datetime('now')
            WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL`,
      args: [otherUserId, actorUserId],
    });
    return { updated: Number((res as any).rowsAffected ?? 0) };
  }

  private async findById(id: string): Promise<Message | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM messages WHERE id = ? LIMIT 1',
      args: [id],
    });
    const row = res.rows[0];
    return row ? mapMessage(row) : null;
  }
}

function mapMessage(row: any): Message {
  return {
    id: String(row.id),
    senderId: String(row.sender_id),
    recipientId: String(row.recipient_id),
    body: String(row.body),
    createdAt: String(row.created_at),
    readAt: row.read_at == null ? null : String(row.read_at),
  };
}