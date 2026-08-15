import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RoutinesService } from './routines.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';

@UseGuards(JwtAuthGuard)
@Controller('routines')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get()
  list(@CurrentUser() current: { userId: string }) {
    return this.routinesService.list(current.userId);
  }

  @Get('active')
  active(@CurrentUser() current: { userId: string }) {
    return this.routinesService.getActive(current.userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() current: { userId: string },
    @Param('id') id: string,
  ) {
    return this.routinesService.findOne(current.userId, id);
  }

  @Post()
  create(
    @CurrentUser() current: { userId: string },
    @Body() dto: CreateRoutineDto,
  ) {
    return this.routinesService.create(current.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() current: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateRoutineDto,
  ) {
    return this.routinesService.update(current.userId, id, dto);
  }

  @Patch(':id/activate')
  activate(
    @CurrentUser() current: { userId: string },
    @Param('id') id: string,
  ) {
    return this.routinesService.activate(current.userId, id);
  }

  @Post('deactivate')
  deactivate(@CurrentUser() current: { userId: string }) {
    return this.routinesService.deactivate(current.userId);
  }

  @Delete(':id')
  remove(
    @CurrentUser() current: { userId: string },
    @Param('id') id: string,
  ) {
    return this.routinesService.remove(current.userId, id);
  }
}
