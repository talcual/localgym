import { Module } from '@nestjs/common';
import { InstructorsModule } from '../instructors/instructors.module';
import { RoutineAssignmentsController } from './routine-assignments.controller';
import { RoutineAssignmentsService } from './routine-assignments.service';

@Module({
  imports: [InstructorsModule],
  controllers: [RoutineAssignmentsController],
  providers: [RoutineAssignmentsService],
  exports: [RoutineAssignmentsService],
})
export class RoutineAssignmentsModule {}