import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@libsql/client';
import { DATABASE } from './database.tokens';

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
        `CREATE INDEX IF NOT EXISTS idx_exercises_user ON exercises(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sessions_user ON session_logs(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sessions_perf ON session_logs(performed_at)`,
        `CREATE INDEX IF NOT EXISTS idx_weight_user ON weight_entries(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_weight_recorded ON weight_entries(recorded_at)`,
        `CREATE INDEX IF NOT EXISTS idx_measurements_user ON body_measurements(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_measurements_recorded ON body_measurements(recorded_at)`,
      ],
      'write',
    );
    this.logger.log('Esquema de base de datos inicializado.');
  }
}
