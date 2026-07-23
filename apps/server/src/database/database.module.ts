import { Global, Module } from '@nestjs/common';
import { createClient, Client } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

import { DATABASE } from './database.tokens';
import { DatabaseInitService } from './database-init.service';

const useTurso =
  Boolean(process.env.TURSO_DATABASE_URL) &&
  Boolean(process.env.TURSO_AUTH_TOKEN);

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: (): Client => {
        if (useTurso) {
          return createClient({
            url: process.env.TURSO_DATABASE_URL as string,
            authToken: process.env.TURSO_AUTH_TOKEN as string,
          });
        }
        const dataDir = path.resolve(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        const file = path.join(dataDir, 'localgym.sqlite');
        return createClient({ url: `file:${file}` });
      },
    },
    DatabaseInitService,
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
