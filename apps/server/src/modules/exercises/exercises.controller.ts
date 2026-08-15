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
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  list(@CurrentUser() current: { userId: string }) {
    return this.exercisesService.list(current.userId);
  }

  /**
   * Lista los ejercicios que NO están asociados a ninguna rutina
   * (ejercicios "libres", creados manualmente y todavía no usados).
   */
  @Get('free')
  listFree(@CurrentUser() current: { userId: string }) {
    return this.exercisesService.listFree(current.userId);
  }

  /**
   * Lista solo los ejercicios creados manualmente por el usuario
   * (excluye los importados por AI Couch / catálogo).
   */
  @Get('manual')
  listManual(@CurrentUser() current: { userId: string }) {
    return this.exercisesService.listManual(current.userId);
  }

  /**
   * Lista solo los ejercicios importados desde el catálogo
   * (los que llegaron vía AI Couch o import manual del catálogo).
   */
  @Get('imported')
  listImported(@CurrentUser() current: { userId: string }) {
    return this.exercisesService.listImported(current.userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() current: { userId: string },
    @Param('id') id: string,
  ) {
    return this.exercisesService.findOne(current.userId, id);
  }

  @Post()
  create(
    @CurrentUser() current: { userId: string },
    @Body() dto: CreateExerciseDto,
  ) {
    return this.exercisesService.create(current.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() current: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateExerciseDto,
  ) {
    return this.exercisesService.update(current.userId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() current: { userId: string },
    @Param('id') id: string,
  ) {
    return this.exercisesService.remove(current.userId, id);
  }
}
