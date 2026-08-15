import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CatalogService, ListCatalogFilter } from './catalog.service';
import { ExercisesService } from '../exercises/exercises.service';

@UseGuards(JwtAuthGuard)
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly exercisesService: ExercisesService,
  ) {}

  @Get()
  list(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const filter: ListCatalogFilter = { category, search };
    return this.catalogService.list(filter);
  }

  @Get('categories')
  categories() {
    return this.catalogService.categories();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const item = await this.catalogService.findOne(id);
    if (!item) throw new NotFoundException('Ejercicio no encontrado en el catálogo');
    return item;
  }

  @Post(':id/import')
  async import(
    @CurrentUser() current: { userId: string },
    @Param('id') id: string,
  ) {
    const item = await this.catalogService.findOne(id);
    if (!item) throw new NotFoundException('Ejercicio no encontrado en el catálogo');

    return this.exercisesService.create(
      current.userId,
      {
        name: item.name,
        type: item.type,
        sets: item.sets,
        durationPerSetSec: item.durationPerSetSec ?? undefined,
        repsPerSet: item.repsPerSet ?? undefined,
        restSec: item.restSec,
        notes: item.notes ?? undefined,
      },
      'ai_import',
    );
  }
}
