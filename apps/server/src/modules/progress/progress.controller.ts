import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '../../database/types';
import { ProgressService } from './progress.service';

@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('summary')
  summary(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
  ) {
    const acting = clientId ?? current.userId;
    return this.progressService.summary(current.userId, current.role, acting);
  }

  @Get('bmi-history')
  bmiHistory(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
  ) {
    const acting = clientId ?? current.userId;
    return this.progressService.bmiHistory(
      current.userId,
      current.role,
      acting,
    );
  }
}