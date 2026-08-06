import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MeasurementsService } from './measurements.service';
import { CreateMeasurementDto } from './dto/create-measurement.dto';

@UseGuards(JwtAuthGuard)
@Controller('measurements')
export class MeasurementsController {
  constructor(
    private readonly measurementsService: MeasurementsService,
  ) {}

  @Get()
  list(@CurrentUser() current: { userId: string }) {
    return this.measurementsService.list(current.userId);
  }

  @Get('latest')
  latest(@CurrentUser() current: { userId: string }) {
    return this.measurementsService.latest(current.userId);
  }

  @Post()
  create(
    @CurrentUser() current: { userId: string },
    @Body() dto: CreateMeasurementDto,
  ) {
    return this.measurementsService.create(current.userId, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() current: { userId: string },
    @Param('id') id: string,
  ) {
    return this.measurementsService.remove(current.userId, id);
  }
}
