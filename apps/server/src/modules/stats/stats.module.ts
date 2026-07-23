import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SessionLog } from '../sessions/entities/session-log.entity';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SessionLog])],
  providers: [StatsService],
  controllers: [StatsController],
})
export class StatsModule {}
