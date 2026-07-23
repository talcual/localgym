import {
  ConflictException,
  Injectable,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly usersService: UsersService) {}

  async onApplicationBootstrap() {
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
}
