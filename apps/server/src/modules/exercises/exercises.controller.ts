import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '../../database/types';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  list(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
  ) {
    const acting = clientId ?? current.userId;
    return this.exercisesService.list(current.userId, current.role, acting);
  }

  @Get('free')
  listFree(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
  ) {
    const acting = clientId ?? current.userId;
    return this.exercisesService.listFree(current.userId, current.role, acting);
  }

  @Get('manual')
  listManual(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
  ) {
    const acting = clientId ?? current.userId;
    return this.exercisesService.listManual(current.userId, current.role, acting);
  }

  @Get('imported')
  listImported(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
  ) {
    const acting = clientId ?? current.userId;
    return this.exercisesService.listImported(current.userId, current.role, acting);
  }

  @Get(':id')
  findOne(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Param('id') id: string,
  ) {
    return this.exercisesService.findOne(current.userId, current.role, id);
  }

  @Post()
  create(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId: string | undefined,
    @Body() dto: CreateExerciseDto,
  ) {
    const target = clientId ?? current.userId;
    return this.exercisesService.create(
      current.userId,
      current.role,
      target,
      dto,
    );
  }

  @Patch(':id')
  update(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Param('id') id: string,
    @Body() dto: UpdateExerciseDto,
  ) {
    return this.exercisesService.update(current.userId, current.role, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Param('id') id: string,
  ) {
    return this.exercisesService.remove(current.userId, current.role, id);
  }
}