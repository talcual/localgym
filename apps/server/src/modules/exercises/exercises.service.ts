import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Exercise } from './entities/exercise.entity';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(Exercise)
    private readonly exercisesRepository: Repository<Exercise>,
  ) {}

  async list(userId: string): Promise<Exercise[]> {
    return this.exercisesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Exercise> {
    const exercise = await this.exercisesRepository.findOne({ where: { id } });
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');
    if (exercise.userId !== userId)
      throw new ForbiddenException('No autorizado');
    return exercise;
  }

  async create(userId: string, dto: CreateExerciseDto): Promise<Exercise> {
    const exercise = this.exercisesRepository.create({
      userId,
      name: dto.name,
      type: dto.type,
      sets: dto.sets,
      durationPerSetSec: dto.durationPerSetSec ?? null,
      repsPerSet: dto.repsPerSet ?? null,
      restSec: dto.restSec ?? 0,
      notes: dto.notes ?? null,
    });
    return this.exercisesRepository.save(exercise);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateExerciseDto,
  ): Promise<Exercise> {
    const exercise = await this.findOne(userId, id);
    Object.assign(exercise, dto);
    return this.exercisesRepository.save(exercise);
  }

  async remove(userId: string, id: string): Promise<void> {
    const exercise = await this.findOne(userId, id);
    await this.exercisesRepository.remove(exercise);
  }
}
