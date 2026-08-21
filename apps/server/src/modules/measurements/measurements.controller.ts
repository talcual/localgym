import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '../../database/types';
import { MeasurementsService } from './measurements.service';
import { CreateMeasurementDto } from './dto/create-measurement.dto';

@UseGuards(JwtAuthGuard)
@Controller('measurements')
export class MeasurementsController {
  constructor(
    private readonly measurementsService: MeasurementsService,
  ) {}

  @Get()
  list(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
  ) {
    const acting = clientId ?? current.userId;
    return this.measurementsService.list(current.userId, current.role, acting);
  }

  @Get('latest')
  latest(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
  ) {
    const acting = clientId ?? current.userId;
    return this.measurementsService.latest(current.userId, current.role, acting);
  }

  @Post()
  create(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId: string | undefined,
    @Body() dto: CreateMeasurementDto,
  ) {
    const target = clientId ?? current.userId;
    return this.measurementsService.create(
      current.userId,
      current.role,
      target,
      dto,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Param('id') id: string,
  ) {
    return this.measurementsService.remove(current.userId, current.role, id);
  }
}