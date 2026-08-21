import { Module } from '@nestjs/common';
import { MeasurementsService } from './measurements.service';
import { MeasurementsController } from './measurements.controller';
import { InstructorsModule } from '../instructors/instructors.module';

@Module({
  imports: [InstructorsModule],
  providers: [MeasurementsService],
  controllers: [MeasurementsController],
  exports: [MeasurementsService],
})
export class MeasurementsModule {}
