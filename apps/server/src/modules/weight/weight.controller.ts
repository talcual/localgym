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
import { WeightService } from './weight.service';
import { CreateWeightEntryDto } from './dto/create-weight-entry.dto';

@UseGuards(JwtAuthGuard)
@Controller('weight')
export class WeightController {
  constructor(private readonly weightService: WeightService) {}

  @Get()
  list(@CurrentUser() current: { userId: string }) {
    return this.weightService.list(current.userId);
  }

  @Get('latest')
  latest(@CurrentUser() current: { userId: string }) {
    return this.weightService.latest(current.userId);
  }

  @Post()
  create(
    @CurrentUser() current: { userId: string },
    @Body() dto: CreateWeightEntryDto,
  ) {
    return this.weightService.create(current.userId, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() current: { userId: string },
    @Param('id') id: string,
  ) {
    return this.weightService.remove(current.userId, id);
  }
}
