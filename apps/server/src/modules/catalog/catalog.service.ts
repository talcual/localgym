import { Inject, Injectable } from '@nestjs/common';
import { Client } from '@libsql/client';

import { DATABASE } from '../../database/database.tokens';
import { CatalogExercise, ExerciseType } from '../../database/types';

export interface ListCatalogFilter {
  category?: string;
  search?: string;
}

@Injectable()
export class CatalogService {
  constructor(@Inject(DATABASE) private readonly db: Client) {}

  async list(filter: ListCatalogFilter): Promise<CatalogExercise[]> {
    const where: string[] = [];
    const args: any[] = [];

    if (filter.category) {
      where.push('category = ?');
      args.push(filter.category);
    }
    if (filter.search) {
      where.push('name LIKE ?');
      args.push(`%${filter.search}%`);
    }

    const sql = `SELECT * FROM exercise_catalog
      ${where.length > 0 ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY category, name`;

    const res = await this.db.execute({ sql, args });
    return res.rows.map(mapCatalogExercise);
  }

  async findOne(id: string): Promise<CatalogExercise | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM exercise_catalog WHERE id = ?',
      args: [id],
    });
    const row = res.rows[0];
    return row ? mapCatalogExercise(row) : null;
  }

  async categories(): Promise<string[]> {
    const res = await this.db.execute({
      sql: 'SELECT DISTINCT category FROM exercise_catalog WHERE category IS NOT NULL ORDER BY category',
      args: [],
    });
    return res.rows.map((r) => String(r.category));
  }
}

function mapCatalogExercise(row: any): CatalogExercise {
  return {
    id: String(row.id),
    name: String(row.name),
    type: row.type as ExerciseType,
    sets: Number(row.sets),
    durationPerSetSec: row.duration_per_set_sec == null ? null : Number(row.duration_per_set_sec),
    repsPerSet: row.reps_per_set == null ? null : Number(row.reps_per_set),
    restSec: Number(row.rest_sec),
    notes: row.notes == null ? null : String(row.notes),
    category: row.category == null ? null : String(row.category),
    createdAt: String(row.created_at),
  };
}
