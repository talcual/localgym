import {
  Injectable,
  Inject,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { Client } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { v4 as uuid } from 'uuid';

import { DATABASE } from '../../database/database.tokens';
import { UsersService } from '../users/users.service';

const CATEGORY_MAP: Record<string, string> = {
  waist: 'Core',
  'upper legs': 'Piernas',
  'lower legs': 'Piernas',
  back: 'Espalda',
  chest: 'Pecho',
  shoulders: 'Hombros',
  'upper arms': 'Brazos',
  'lower arms': 'Brazos',
  cardio: 'Cardio',
  neck: 'Cuello',
};

const TIME_BASED_EQUIPMENT = new Set([
  'assisted',
  'stationary bike',
  'elliptical machine',
  'stepmill machine',
  'upper body ergometer',
  'skierg machine',
  'sled machine',
]);

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 12;
const DEFAULT_DURATION = 30;
const DEFAULT_REST = 30;

interface RawExercise {
  id: string;
  name: string;
  category: string;
  body_part: string;
  equipment: string;
  instructions?: Record<string, string>;
}

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly usersService: UsersService,
    @Inject(DATABASE) private readonly db: Client,
  ) {}

  async onApplicationBootstrap() {
    await this.seedUser();
    await this.seedCatalog();
    await this.seedInstructorAndClient();
  }

  /**
   * Crea un instructor y un cliente demo con una invitación ya aceptada y
   * una rutina escrita por el instructor asignada al cliente. Solo se ejecuta
   * si los emails no existen todavía (idempotente).
   */
  private async seedInstructorAndClient() {
    const instructorEmail = 'instructor@modofit.dev';
    const clientEmail = 'cliente@modofit.dev';

    const existingInstructor = await this.usersService.findByEmail(instructorEmail);
    const existingClient = await this.usersService.findByEmail(clientEmail);

    if (existingInstructor && existingClient) {
      this.logger.log('Seed: instructor y cliente demo ya existen, omitiendo.');
      return;
    }

    const instructor =
      existingInstructor ??
      (await this.usersService.create(
        instructorEmail,
        'instructor123',
        'Coach Demo',
        'INSTRUCTOR',
      ));

    const client =
      existingClient ??
      (await this.usersService.create(
        clientEmail,
        'cliente123',
        'Cliente Demo',
        'CLIENT',
      ));

    // Relación activa instructor ↔ cliente.
    const relCheck = await this.db.execute({
      sql: `SELECT 1 FROM instructor_clients
            WHERE instructor_id = ? AND client_id = ? AND status = 'ACTIVE'`,
      args: [instructor.id, client.id],
    });
    if (relCheck.rows.length === 0) {
      await this.db.execute({
        sql: `INSERT INTO instructor_clients
              (id, instructor_id, client_id, status, accepted_at)
              VALUES (?, ?, ?, 'ACTIVE', datetime('now'))`,
        args: [uuid(), instructor.id, client.id],
      });
      this.logger.log(
        `Seed: relación instructor ${instructorEmail} <-> ${clientEmail} creada.`,
      );
    }

    // Rutina escrita por el instructor y asignada al cliente.
    const routineCheck = await this.db.execute({
      sql: `SELECT 1 FROM routines
            WHERE user_id = ? AND written_by_instructor_id = ?
            LIMIT 1`,
      args: [client.id, instructor.id],
    });
    if (routineCheck.rows.length === 0) {
      const routineId = uuid();
      await this.db.execute({
        sql: `INSERT INTO routines
              (id, user_id, title, goal, level, days_per_week, is_active,
               summary, written_by_instructor_id)
              VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        args: [
          routineId,
          client.id,
          'Hipertrofia 4 días (demo)',
          'hypertrophy',
          'beginner',
          4,
          'Rutina de ejemplo escrita por el instructor demo.',
          instructor.id,
        ],
      });

      const dayPlan = [
        { dayIndex: 0, label: 'Pecho y tríceps' },
        { dayIndex: 1, label: 'Espalda y bíceps' },
        { dayIndex: 2, label: 'Pierna' },
        { dayIndex: 3, label: 'Hombro y core' },
      ];
      const catalogRes = await this.db.execute({
        sql: 'SELECT id FROM exercise_catalog LIMIT 12',
        args: [],
      });
      const catalogIds = catalogRes.rows.map((r) => String(r.id));
      let pos = 0;
      for (const d of dayPlan) {
        for (let i = 0; i < 3; i++) {
          const catalogId = catalogIds[(pos + i) % catalogIds.length];
          await this.db.execute({
            sql: `INSERT INTO routine_items
                  (id, routine_id, day_index, day_label, position,
                   exercise_id, catalog_id, sets, reps, duration_per_set_sec, rest_sec, notes)
                  VALUES (?, ?, ?, ?, ?, NULL, ?, 3, 12, NULL, 60, NULL)`,
            args: [uuid(), routineId, d.dayIndex, d.label, pos, catalogId],
          });
          pos++;
        }
      }

      // Asignación con ventana que ya está vigente.
      await this.db.execute({
        sql: `INSERT INTO routine_assignments
              (id, routine_id, client_id, instructor_id, start_date, end_date, status)
              VALUES (?, ?, ?, ?, date('now'), date('now', '+30 days'), 'ACTIVE')`,
        args: [uuid(), routineId, client.id, instructor.id],
      });

      this.logger.log(
        `Seed: rutina demo escrita por instructor y asignada al cliente.`,
      );
    }
  }

  private async seedUser() {
    const email = 'admin@localgym.dev';
    const password = 'admin123';
    const displayName = 'Admin';

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      this.logger.log(`Seed: usuario ${email} ya existe, omitiendo.`);
      return;
    }

    await this.usersService.create(email, password, displayName);
    this.logger.log(`Seed: usuario creado -> ${email} / ${password}`);
  }

  private resolveDatasetPath(): string | null {
    const candidates = [
      resolve(process.cwd(), 'exercises.json'),
      resolve(process.cwd(), '..', '..', 'exercises.json'),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
    return null;
  }

  private async seedCatalog() {
    const res = await this.db.execute({
      sql: 'SELECT COUNT(*) as cnt FROM exercise_catalog',
      args: [],
    });
    const count = Number(res.rows[0].cnt);
    if (count > 0) {
      this.logger.log(`Seed: catálogo ya tiene ${count} ejercicios, omitiendo.`);
      return;
    }

    const datasetPath = this.resolveDatasetPath();
    if (!datasetPath) {
      this.logger.warn(
        'Seed: no se encontró exercises.json, usando catálogo fallback de 26 ejercicios.',
      );
      await this.seedFallbackCatalog();
      return;
    }

    let raw: RawExercise[];
    try {
      const file = readFileSync(datasetPath, 'utf-8');
      raw = JSON.parse(file) as RawExercise[];
    } catch (err) {
      this.logger.error(
        `Seed: error leyendo/parseando exercises.json: ${(err as Error).message}. Usando fallback.`,
      );
      await this.seedFallbackCatalog();
      return;
    }

    if (!Array.isArray(raw) || raw.length === 0) {
      this.logger.warn('Seed: exercises.json vacío o inválido, usando fallback.');
      await this.seedFallbackCatalog();
      return;
    }

    const inserts: { sql: string; args: unknown[] }[] = [];
    let skipped = 0;

    for (const ex of raw) {
      if (!ex || !ex.id || !ex.name) {
        skipped++;
        continue;
      }
      const category =
        CATEGORY_MAP[(ex.body_part || ex.category || '').toLowerCase()] ??
        CATEGORY_MAP[(ex.category || '').toLowerCase()] ??
        null;

      const type: 'TIME' | 'REPS' | 'MIXED' = TIME_BASED_EQUIPMENT.has(
        (ex.equipment || '').toLowerCase(),
      )
        ? 'TIME'
        : 'REPS';

      const notes = ex.instructions?.es
        ? String(ex.instructions.es).slice(0, 2000)
        : null;

      const durationPerSetSec = type === 'TIME' ? DEFAULT_DURATION : null;
      const repsPerSet = type === 'REPS' ? DEFAULT_REPS : null;

      inserts.push({
        sql: `INSERT INTO exercise_catalog
              (id, name, type, sets, duration_per_set_sec, reps_per_set, rest_sec, notes, category)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          ex.id,
          ex.name,
          type,
          DEFAULT_SETS,
          durationPerSetSec,
          repsPerSet,
          DEFAULT_REST,
          notes,
          category,
        ],
      });
    }

    for (const stmt of inserts) {
      await this.db.execute({
        sql: stmt.sql.replace('INSERT INTO', 'INSERT OR IGNORE INTO'),
        args: stmt.args as any,
      });
    }

    this.logger.log(
      `Seed: catálogo poblado con ${inserts.length} ejercicios desde ${datasetPath} (${skipped} omitidos).`,
    );
  }

  private async seedFallbackCatalog() {
    const fallback = [
      { name: 'Sentadillas', type: 'REPS', sets: 3, repsPerSet: 15, restSec: 60, category: 'Piernas' },
      { name: 'Zancadas', type: 'REPS', sets: 3, repsPerSet: 12, restSec: 45, category: 'Piernas' },
      { name: 'Peso muerto', type: 'REPS', sets: 4, repsPerSet: 10, restSec: 90, category: 'Piernas' },
      { name: 'Elevación de talones', type: 'REPS', sets: 3, repsPerSet: 20, restSec: 30, category: 'Piernas' },
      { name: 'Sentadilla búlgara', type: 'REPS', sets: 3, repsPerSet: 10, restSec: 60, category: 'Piernas' },
      { name: 'Flexiones', type: 'REPS', sets: 3, repsPerSet: 15, restSec: 45, category: 'Pecho' },
      { name: 'Flexiones diamante', type: 'REPS', sets: 3, repsPerSet: 10, restSec: 45, category: 'Pecho' },
      { name: 'Flexiones declinadas', type: 'REPS', sets: 3, repsPerSet: 12, restSec: 45, category: 'Pecho' },
      { name: 'Dominadas', type: 'REPS', sets: 3, repsPerSet: 8, restSec: 90, category: 'Espalda' },
      { name: 'Remo con mancuerna', type: 'REPS', sets: 3, repsPerSet: 12, restSec: 60, category: 'Espalda' },
      { name: 'Superman', type: 'TIME', sets: 3, durationPerSetSec: 30, restSec: 30, category: 'Espalda' },
      { name: 'Pino press', type: 'REPS', sets: 3, repsPerSet: 8, restSec: 60, category: 'Hombros' },
      { name: 'Elevaciones laterales', type: 'REPS', sets: 3, repsPerSet: 15, restSec: 30, category: 'Hombros' },
      { name: 'Pájaros', type: 'REPS', sets: 3, repsPerSet: 12, restSec: 45, category: 'Hombros' },
      { name: 'Plancha frontal', type: 'TIME', sets: 3, durationPerSetSec: 45, restSec: 30, category: 'Core' },
      { name: 'Plancha lateral', type: 'TIME', sets: 3, durationPerSetSec: 30, restSec: 30, category: 'Core' },
      { name: 'Crunch', type: 'REPS', sets: 3, repsPerSet: 20, restSec: 30, category: 'Core' },
      { name: 'Bicicleta', type: 'REPS', sets: 3, repsPerSet: 20, restSec: 30, category: 'Core' },
      { name: 'Russian twist', type: 'REPS', sets: 3, repsPerSet: 16, restSec: 30, category: 'Core' },
      { name: 'Elevación de piernas', type: 'REPS', sets: 3, repsPerSet: 12, restSec: 30, category: 'Core' },
      { name: 'Fondos de tríceps', type: 'REPS', sets: 3, repsPerSet: 12, restSec: 45, category: 'Brazos' },
      { name: 'Curl de bíceps', type: 'REPS', sets: 3, repsPerSet: 12, restSec: 45, category: 'Brazos' },
      { name: 'Burpees', type: 'REPS', sets: 3, repsPerSet: 10, restSec: 60, category: 'Full body' },
      { name: 'Mountain climbers', type: 'TIME', sets: 3, durationPerSetSec: 30, restSec: 30, category: 'Full body' },
      { name: 'Jumping jacks', type: 'TIME', sets: 3, durationPerSetSec: 30, restSec: 20, category: 'Full body' },
    ];

    for (const ex of fallback) {
      await this.db.execute({
        sql: `INSERT INTO exercise_catalog
              (id, name, type, sets, duration_per_set_sec, reps_per_set, rest_sec, notes, category)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          uuid(),
          ex.name,
          ex.type,
          ex.sets,
          (ex as any).durationPerSetSec ?? null,
          (ex as any).repsPerSet ?? null,
          ex.restSec,
          null,
          ex.category,
        ],
      });
    }
    this.logger.log(`Seed: ${fallback.length} ejercicios (fallback) agregados al catálogo.`);
  }
}
