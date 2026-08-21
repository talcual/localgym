import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '../../database/types';
import { StatsService } from './stats.service';

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('summary')
  summary(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
    @Query('tz') tz?: string,
  ) {
    const acting = clientId ?? current.userId;
    return this.statsService.summary(current.userId, current.role, acting, tz);
  }

  @Get('by-day')
  byDay(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
    @Query('days') days?: string,
    @Query('tz') tz?: string,
  ) {
    const acting = clientId ?? current.userId;
    const parsed = Math.max(1, Math.min(365, Number(days) || 30));
    return this.statsService.byDay(
      current.userId,
      current.role,
      acting,
      parsed,
      tz,
    );
  }

  @Get('by-exercise')
  byExercise(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
  ) {
    const acting = clientId ?? current.userId;
    return this.statsService.byExercise(
      current.userId,
      current.role,
      acting,
    );
  }
}