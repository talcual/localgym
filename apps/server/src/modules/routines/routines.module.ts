import { Module } from '@nestjs/common';

import { RoutinesService } from './routines.service';
import { RoutinesController } from './routines.controller';
import { InstructorsModule } from '../instructors/instructors.module';
import { RoutineAssignmentsModule } from '../routine-assignments/routine-assignments.module';

@Module({
  imports: [InstructorsModule, RoutineAssignmentsModule],
  providers: [RoutinesService],
  controllers: [RoutinesController],
  exports: [RoutinesService],
})
export class RoutinesModule {}
