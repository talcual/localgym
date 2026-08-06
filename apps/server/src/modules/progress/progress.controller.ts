import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProgressService } from './progress.service';

@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('summary')
  summary(@CurrentUser() current: { userId: string }) {
    return this.progressService.summary(current.userId);
  }

  @Get('bmi-history')
  bmiHistory(@CurrentUser() current: { userId: string }) {
    return this.progressService.bmiHistory(current.userId);
  }
}
