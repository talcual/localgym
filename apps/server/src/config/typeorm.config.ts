import { DataSourceOptions } from 'typeorm';
import * as path from 'path';

const useTurso =
  Boolean(process.env.TURSO_DATABASE_URL) &&
  Boolean(process.env.TURSO_AUTH_TOKEN);

const tursoOptions: DataSourceOptions = {
  type: 'libsql',
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
  logging: false,
} as unknown as DataSourceOptions;

const sqliteOptions: DataSourceOptions = {
  type: 'sqlite',
  database: path.resolve(process.cwd(), 'data', 'localgym.sqlite'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
  logging: false,
};

export const dataSourceOptions: DataSourceOptions = useTurso
  ? tursoOptions
  : sqliteOptions;
