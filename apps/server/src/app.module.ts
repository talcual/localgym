import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { StatsModule } from './modules/stats/stats.module';
import { SeedModule } from './modules/seed/seed.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { WeightModule } from './modules/weight/weight.module';
import { MeasurementsModule } from './modules/measurements/measurements.module';
import { ProgressModule } from './modules/progress/progress.module';
import { OllamaModule } from './modules/ollama/ollama.module';
import { RoutinesModule } from './modules/routines/routines.module';
import { InstructorsModule } from './modules/instructors/instructors.module';
import { RoutineAssignmentsModule } from './modules/routine-assignments/routine-assignments.module';
import { MessagesModule } from './modules/messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ExercisesModule,
    SessionsModule,
    StatsModule,
    SeedModule,
    CatalogModule,
    WeightModule,
    MeasurementsModule,
    ProgressModule,
    OllamaModule,
    RoutinesModule,
    InstructorsModule,
    RoutineAssignmentsModule,
    MessagesModule,
  ],
})
export class AppModule {}
