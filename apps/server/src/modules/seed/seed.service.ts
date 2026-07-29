import {
  Injectable,
  Inject,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import { Client } from '@libsql/client';
import { v4 as uuid } from 'uuid';

import { DATABASE } from '../../database/database.tokens';
import { UsersService } from '../users/users.service';

const CATALOG_EXERCISES = [
  // Piernas
  { name: 'Sentadillas', type: 'REPS', sets: 3, repsPerSet: 15, restSec: 60, category: 'Piernas' },
  { name: 'Zancadas', type: 'REPS', sets: 3, repsPerSet: 12, restSec: 45, category: 'Piernas' },
  { name: 'Peso muerto', type: 'REPS', sets: 4, repsPerSet: 10, restSec: 90, category: 'Piernas' },
  { name: 'Elevación de talones', type: 'REPS', sets: 3, repsPerSet: 20, restSec: 30, category: 'Piernas' },
  { name: 'Sentadilla búlgara', type: 'REPS', sets: 3, repsPerSet: 10, restSec: 60, category: 'Piernas' },
  // Pecho
  { name: 'Flexiones', type: 'REPS', sets: 3, repsPerSet: 15, restSec: 45, category: 'Pecho' },
  { name: 'Flexiones diamante', type: 'REPS', sets: 3, repsPerSet: 10, restSec: 45, category: 'Pecho' },
  { name: 'Flexiones declinadas', type: 'REPS', sets: 3, repsPerSet: 12, restSec: 45, category: 'Pecho' },
  // Espalda
  { name: 'Dominadas', type: 'REPS', sets: 3, repsPerSet: 8, restSec: 90, category: 'Espalda' },
  { name: 'Remo con mancuerna', type: 'REPS', sets: 3, repsPerSet: 12, restSec: 60, category: 'Espalda' },
  { name: 'Superman', type: 'TIME', sets: 3, durationPerSetSec: 30, restSec: 30, category: 'Espalda' },
  // Hombros
  { name: 'Pino press', type: 'REPS', sets: 3, repsPerSet: 8, restSec: 60, category: 'Hombros' },
  { name: 'Elevaciones laterales', type: 'REPS', sets: 3, repsPerSet: 15, restSec: 30, category: 'Hombros' },
  { name: 'Pájaros', type: 'REPS', sets: 3, repsPerSet: 12, restSec: 45, category: 'Hombros' },
  // Core
  { name: 'Plancha frontal', type: 'TIME', sets: 3, durationPerSetSec: 45, restSec: 30, category: 'Core' },
  { name: 'Plancha lateral', type: 'TIME', sets: 3, durationPerSetSec: 30, restSec: 30, category: 'Core' },
  { name: 'Crunch', type: 'REPS', sets: 3, repsPerSet: 20, restSec: 30, category: 'Core' },
  { name: 'Bicicleta', type: 'REPS', sets: 3, repsPerSet: 20, restSec: 30, category: 'Core' },
  { name: 'Russian twist', type: 'REPS', sets: 3, repsPerSet: 16, restSec: 30, category: 'Core' },
  { name: 'Elevación de piernas', type: 'REPS', sets: 3, repsPerSet: 12, restSec: 30, category: 'Core' },
  // Brazos
  { name: 'Fondos de tríceps', type: 'REPS', sets: 3, repsPerSet: 12, restSec: 45, category: 'Brazos' },
  { name: 'Curl de bíceps', type: 'REPS', sets: 3, repsPerSet: 12, restSec: 45, category: 'Brazos' },
  // Full body
  { name: 'Burpees', type: 'REPS', sets: 3, repsPerSet: 10, restSec: 60, category: 'Full body' },
  { name: 'Mountain climbers', type: 'TIME', sets: 3, durationPerSetSec: 30, restSec: 30, category: 'Full body' },
  { name: 'Jumping jacks', type: 'TIME', sets: 3, durationPerSetSec: 30, restSec: 20, category: 'Full body' },
];

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

  private async seedCatalog() {
    const res = await this.db.execute({ sql: 'SELECT COUNT(*) as cnt FROM exercise_catalog', args: [] });
    const count = Number(res.rows[0].cnt);
    if (count > 0) {
      this.logger.log(`Seed: catálogo ya tiene ${count} ejercicios, omitiendo.`);
      return;
    }

    for (const ex of CATALOG_EXERCISES) {
      await this.db.execute({
        sql: `INSERT INTO exercise_catalog (id, name, type, sets, duration_per_set_sec, reps_per_set, rest_sec, notes, category)
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
    this.logger.log(`Seed: ${CATALOG_EXERCISES.length} ejercicios agregados al catálogo.`);
  }
}
