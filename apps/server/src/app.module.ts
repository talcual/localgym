import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './modules/users/entities/user.entity';
import { Exercise } from './modules/exercises/entities/exercise.entity';
import { SessionLog } from './modules/sessions/entities/session-log.entity';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { StatsModule } from './modules/stats/stats.module';
import { SeedModule } from './modules/seed/seed.module';
import { dataSourceOptions } from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(dataSourceOptions),
    AuthModule,
    UsersModule,
    ExercisesModule,
    SessionsModule,
    StatsModule,
    SeedModule,
  ],
})
export class AppModule {}
