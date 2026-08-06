import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { WeightModule } from '../weight/weight.module';
import { MeasurementsModule } from '../measurements/measurements.module';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';

@Module({
  imports: [UsersModule, WeightModule, MeasurementsModule],
  providers: [ProgressService],
  controllers: [ProgressController],
  exports: [ProgressService],
})
export class ProgressModule {}
