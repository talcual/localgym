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
import { WeightService } from './weight.service';
import { CreateWeightEntryDto } from './dto/create-weight-entry.dto';

@UseGuards(JwtAuthGuard)
@Controller('weight')
export class WeightController {
  constructor(private readonly weightService: WeightService) {}

  @Get()
  list(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
  ) {
    const acting = clientId ?? current.userId;
    return this.weightService.list(current.userId, current.role, acting);
  }

  @Get('latest')
  latest(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
  ) {
    const acting = clientId ?? current.userId;
    return this.weightService.latest(current.userId, current.role, acting);
  }

  @Post()
  create(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId: string | undefined,
    @Body() dto: CreateWeightEntryDto,
  ) {
    const target = clientId ?? current.userId;
    return this.weightService.create(current.userId, current.role, target, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Param('id') id: string,
  ) {
    return this.weightService.remove(current.userId, current.role, id);
  }
}