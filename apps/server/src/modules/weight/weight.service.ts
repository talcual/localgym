import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Client } from '@libsql/client';
import { v4 as uuid } from 'uuid';

import { DATABASE } from '../../database/database.tokens';
import { WeightEntry } from '../../database/types';
import { CreateWeightEntryDto } from './dto/create-weight-entry.dto';

@Injectable()
export class WeightService {
  constructor(@Inject(DATABASE) private readonly db: Client) {}

  async list(userId: string): Promise<WeightEntry[]> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM weight_entries WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 500',
      args: [userId],
    });
    return res.rows.map(mapWeight);
  }

  async latest(userId: string): Promise<WeightEntry | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM weight_entries WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1',
      args: [userId],
    });
    const row = res.rows[0];
    return row ? mapWeight(row) : null;
  }

  async create(userId: string, dto: CreateWeightEntryDto): Promise<WeightEntry> {
    const id = uuid();
    const recordedAt = dto.recordedAt
      ? new Date(dto.recordedAt).toISOString()
      : new Date().toISOString();
    await this.db.execute({
      sql: `INSERT INTO weight_entries (id, user_id, weight_kg, recorded_at, note)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, userId, dto.weightKg, recordedAt, dto.note ?? null],
    });
    const res = await this.db.execute({
      sql: 'SELECT * FROM weight_entries WHERE id = ?',
      args: [id],
    });
    return mapWeight(res.rows[0]);
  }

  async remove(userId: string, id: string): Promise<void> {
    const res = await this.db.execute({
      sql: 'SELECT user_id FROM weight_entries WHERE id = ?',
      args: [id],
    });
    const row = res.rows[0];
    if (!row) throw new NotFoundException('Registro no encontrado');
    if (String(row.user_id) !== userId) {
      throw new NotFoundException('Registro no encontrado');
    }
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
