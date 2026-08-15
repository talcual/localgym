import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@libsql/client';
import { DATABASE } from './database.tokens';

interface ColumnSpec {
  name: string;
  type: string;
}

const SCHEMA: Array<{ table: string; columns: ColumnSpec[] }> = [
  {
    table: 'users',
    columns: [
      { name: 'height_cm', type: 'REAL' },
      { name: 'sex', type: 'TEXT' },
      { name: 'birthdate', type: 'TEXT' },
    ],
  },
  {
    table: 'exercises',
    columns: [
      { name: 'source', type: "TEXT NOT NULL DEFAULT 'manual'" },
    ],
  },
];

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(@Inject(DATABASE) private readonly db: Client) {}

  async onModuleInit() {
    await this.db.batch(
      [
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          display_name TEXT NOT NULL,
          height_cm REAL,
          sex TEXT,
          birthdate TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS exercises (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'TIME',
          sets INTEGER NOT NULL DEFAULT 1,
          duration_per_set_sec INTEGER,
          reps_per_set INTEGER,
          rest_sec INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          source TEXT NOT NULL DEFAULT 'manual',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS session_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          exercise_id TEXT NOT NULL,
          performed_at TEXT NOT NULL,
          sets_completed INTEGER NOT NULL,
          total_duration_sec INTEGER NOT NULL DEFAULT 0,
          total_reps INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS exercise_catalog (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'TIME',
          sets INTEGER NOT NULL DEFAULT 1,
          duration_per_set_sec INTEGER,
          reps_per_set INTEGER,
          rest_sec INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          category TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS weight_entries (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          weight_kg REAL NOT NULL,
          recorded_at TEXT NOT NULL,
          note TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS body_measurements (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          recorded_at TEXT NOT NULL,
          chest_cm REAL,
          waist_cm REAL,
          hips_cm REAL,
          left_arm_cm REAL,
          right_arm_cm REAL,
          left_thigh_cm REAL,
          right_thigh_cm REAL,
          left_calf_cm REAL,
          right_calf_cm REAL,
          neck_cm REAL,
          shoulders_cm REAL,
          body_fat_pct REAL,
          note TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS routines (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          goal TEXT NOT NULL,
          level TEXT NOT NULL,
          days_per_week INTEGER NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 0,
          summary TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS routine_items (
          id TEXT PRIMARY KEY,
          routine_id TEXT NOT NULL,
          day_index INTEGER NOT NULL,
          day_label TEXT NOT NULL,
          position INTEGER NOT NULL DEFAULT 0,
          exercise_id TEXT,
          catalog_id TEXT,
          sets INTEGER,
          reps INTEGER,
          duration_per_set_sec INTEGER,
          rest_sec INTEGER,
          notes TEXT,
          FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
          FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL,
          FOREIGN KEY (catalog_id) REFERENCES exercise_catalog(id) ON DELETE SET NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_exercises_user ON exercises(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sessions_user ON session_logs(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sessions_perf ON session_logs(performed_at)`,
        `CREATE INDEX IF NOT EXISTS idx_weight_user ON weight_entries(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_weight_recorded ON weight_entries(recorded_at)`,
        `CREATE INDEX IF NOT EXISTS idx_measurements_user ON body_measurements(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_measurements_recorded ON body_measurements(recorded_at)`,
        `CREATE INDEX IF NOT EXISTS idx_routines_user ON routines(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_routines_active ON routines(user_id, is_active)`,
        `CREATE INDEX IF NOT EXISTS idx_routine_items_routine ON routine_items(routine_id)`,
      ],
      'write',
    );

    await this.migrateColumns();

    this.logger.log('Esquema de base de datos inicializado.');
  }

  private async migrateColumns() {
    for (const { table, columns } of SCHEMA) {
      const existing = await this.getExistingColumns(table);
      const missing = columns.filter((c) => !existing.has(c.name));
      for (const col of missing) {
        const sql = `ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`;
        try {
          await this.db.execute({ sql, args: [] });
          this.logger.log(
            `Migración: ${table}.${col.name} (${col.type}) agregada.`,
          );
        } catch (err) {
          const msg = (err as Error)?.message ?? String(err);
          this.logger.warn(
            `Migración: no se pudo agregar ${table}.${col.name}: ${msg}`,
          );
        }
      }
    }
  }

  private async getExistingColumns(table: string): Promise<Set<string>> {
    const res = await this.db.execute({
      sql: `SELECT name FROM PRAGMA_TABLE_INFO('${table}')`,
      args: [],
    });
    return new Set(res.rows.map((r: any) => String(r.name)));
  }
}
