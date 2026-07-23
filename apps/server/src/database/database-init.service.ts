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
        `CREATE INDEX IF NOT EXISTS idx_exercises_user ON exercises(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sessions_user ON session_logs(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_sessions_perf ON session_logs(performed_at)`,
      ],
      'write',
    );
    this.logger.log('Esquema de base de datos inicializado.');
  }
}
