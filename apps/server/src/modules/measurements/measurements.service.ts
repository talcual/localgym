import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Client } from '@libsql/client';
import { v4 as uuid } from 'uuid';

import { DATABASE } from '../../database/database.tokens';
import { BodyMeasurement, UserRole } from '../../database/types';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { InstructorsService } from '../instructors/instructors.service';

@Injectable()
export class MeasurementsService {
  constructor(
    @Inject(DATABASE) private readonly db: Client,
    private readonly instructorsService: InstructorsService,
  ) {}

  async list(
    actorUserId: string,
    actorRole: UserRole,
    actingUserId: string,
  ): Promise<BodyMeasurement[]> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      actingUserId,
    );
    const res = await this.db.execute({
      sql: 'SELECT * FROM body_measurements WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 500',
      args: [actingUserId],
    });
    return res.rows.map(mapMeasurement);
  }

  async latest(
    actorUserId: string,
    actorRole: UserRole,
    actingUserId: string,
  ): Promise<BodyMeasurement | null> {
    await this.instructorsService.assertCanAccessClient(
      actorUserId,
      actorRole,
      actingUserId,
    );
    const res = await this.db.execute({
      sql: 'SELECT * FROM body_measurements WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1',
      args: [actingUserId],
    });
    const row = res.rows[0];
    return row ? mapMeasurement(row) : null;
  }

  async create(
    actorUserId: string,
    actorRole: UserRole,
    targetUserId: string,
    dto: CreateMeasurementDto,
  ): Promise<BodyMeasurement> {
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
      sql: `INSERT INTO body_measurements
        (id, user_id, recorded_at, chest_cm, waist_cm, hips_cm,
         left_arm_cm, right_arm_cm, left_thigh_cm, right_thigh_cm,
         left_calf_cm, right_calf_cm, neck_cm, shoulders_cm,
         body_fat_pct, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        targetUserId,
        recordedAt,
        dto.chestCm ?? null,
        dto.waistCm ?? null,
        dto.hipsCm ?? null,
        dto.leftArmCm ?? null,
        dto.rightArmCm ?? null,
        dto.leftThighCm ?? null,
        dto.rightThighCm ?? null,
        dto.leftCalfCm ?? null,
        dto.rightCalfCm ?? null,
        dto.neckCm ?? null,
        dto.shouldersCm ?? null,
        dto.bodyFatPct ?? null,
        dto.note ?? null,
      ],
    });

    const res = await this.db.execute({
      sql: 'SELECT * FROM body_measurements WHERE id = ?',
      args: [id],
    });
    return mapMeasurement(res.rows[0]);
  }

  async remove(
    actorUserId: string,
    actorRole: UserRole,
    id: string,
  ): Promise<void> {
    const res = await this.db.execute({
      sql: 'SELECT user_id FROM body_measurements WHERE id = ?',
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
      sql: 'DELETE FROM body_measurements WHERE id = ?',
      args: [id],
    });
  }
}

function mapMeasurement(row: any): BodyMeasurement {
  const numOrNull = (v: any) => (v == null ? null : Number(v));
  return {
    id: String(row.id),
    userId: String(row.user_id),
    recordedAt: String(row.recorded_at),
    chestCm: numOrNull(row.chest_cm),
    waistCm: numOrNull(row.waist_cm),
    hipsCm: numOrNull(row.hips_cm),
    leftArmCm: numOrNull(row.left_arm_cm),
    rightArmCm: numOrNull(row.right_arm_cm),
    leftThighCm: numOrNull(row.left_thigh_cm),
    rightThighCm: numOrNull(row.right_thigh_cm),
    leftCalfCm: numOrNull(row.left_calf_cm),
    rightCalfCm: numOrNull(row.right_calf_cm),
    neckCm: numOrNull(row.neck_cm),
    shouldersCm: numOrNull(row.shoulders_cm),
    bodyFatPct: numOrNull(row.body_fat_pct),
    note: row.note == null ? null : String(row.note),
    createdAt: String(row.created_at),
  };
}