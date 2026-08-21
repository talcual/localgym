import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Client } from '@libsql/client';
import { v4 as uuid } from 'uuid';

import { DATABASE } from '../../database/database.tokens';
import { UserRole, WeightEntry } from '../../database/types';
import { CreateWeightEntryDto } from './dto/create-weight-entry.dto';
import { InstructorsService } from '../instructors/instructors.service';

@Injectable()
export class WeightService {
  constructor(
    @Inject(DATABASE) private readonly db: Client,
    private readonly instructorsService: InstructorsService,
  ) {}

  async list(
    actorUserId: string,
    actorRole: UserRole,
    actingUserId: string,
  ): Promise<WeightEntry[]> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      actingUserId,
    );
    const res = await this.db.execute({
      sql: 'SELECT * FROM weight_entries WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 500',
      args: [actingUserId],
    });
    return res.rows.map(mapWeight);
  }

  async latest(
    actorUserId: string,
    actorRole: UserRole,
    actingUserId: string,
  ): Promise<WeightEntry | null> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      actingUserId,
    );
    const res = await this.db.execute({
      sql: 'SELECT * FROM weight_entries WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1',
      args: [actingUserId],
    });
    const row = res.rows[0];
    return row ? mapWeight(row) : null;
  }

  async create(
    actorUserId: string,
    actorRole: UserRole,
    targetUserId: string,
    dto: CreateWeightEntryDto,
  ): Promise<WeightEntry> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      targetUserId,
    );
    const id = uuid();
    const recordedAt = dto.recordedAt
      ? new Date(dto.recordedAt).toISOString()
      : new Date().toISOString();
    await this.db.execute({
      sql: `INSERT INTO weight_entries (id, user_id, weight_kg, recorded_at, note)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, targetUserId, dto.weightKg, recordedAt, dto.note ?? null],
    });
    const res = await this.db.execute({
      sql: 'SELECT * FROM weight_entries WHERE id = ?',
      args: [id],
    });
    return mapWeight(res.rows[0]);
  }

  async remove(
    actorUserId: string,
    actorRole: UserRole,
    id: string,
  ): Promise<void> {
    const res = await this.db.execute({
      sql: 'SELECT user_id FROM weight_entries WHERE id = ?',
      args: [id],
    });
    const row = res.rows[0];
    if (!row) throw new NotFoundException('Registro no encontrado');
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      String(row.user_id),
    );
    await this.db.execute({
      sql: 'DELETE FROM weight_entries WHERE id = ?',
      args: [id],
    });
  }
}

function mapWeight(row: any): WeightEntry {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    weightKg: Number(row.weight_kg),
    recordedAt: String(row.recorded_at),
    note: row.note == null ? null : String(row.note),
    createdAt: String(row.created_at),
  };
}