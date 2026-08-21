import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { InstructorsModule } from '../instructors/instructors.module';

@Module({
  imports: [InstructorsModule],
  providers: [StatsService],
  controllers: [StatsController],
})
export class StatsModule {}
