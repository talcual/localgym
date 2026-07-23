import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StatsService } from './stats.service';

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('summary')
  summary(@CurrentUser() current: { userId: string }) {
    return this.statsService.summary(current.userId);
  }

  @Get('by-day')
  byDay(
    @CurrentUser() current: { userId: string },
    @Query('days') days?: string,
  ) {
    const parsed = Math.max(1, Math.min(365, Number(days) || 30));
    return this.statsService.byDay(current.userId, parsed);
  }

  @Get('by-exercise')
  byExercise(@CurrentUser() current: { userId: string }) {
    return this.statsService.byExercise(current.userId);
  }
}
