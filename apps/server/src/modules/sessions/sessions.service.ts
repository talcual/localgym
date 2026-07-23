import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

import { SessionLog } from './entities/session-log.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { CreateSessionDto } from './dto/create-session.dto';

export interface ListSessionsFilter {
  from?: string;
  to?: string;
  exerciseId?: string;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(SessionLog)
    private readonly sessionsRepository: Repository<SessionLog>,
    @InjectRepository(Exercise)
    private readonly exercisesRepository: Repository<Exercise>,
  ) {}

  async list(
    userId: string,
    filter: ListSessionsFilter,
  ): Promise<SessionLog[]> {
    const where: any = { userId };
    if (filter.exerciseId) where.exerciseId = filter.exerciseId;
    if (filter.from && filter.to) {
      where.performedAt = Between(new Date(filter.from), new Date(filter.to));
    } else if (filter.from) {
      where.performedAt = MoreThanOrEqual(new Date(filter.from));
    } else if (filter.to) {
      where.performedAt = LessThanOrEqual(new Date(filter.to));
    }
    return this.sessionsRepository.find({
      where,
      order: { performedAt: 'DESC' },
      relations: ['exercise'],
      take: 200,
    });
  }

  async findOne(userId: string, id: string): Promise<SessionLog> {
    const session = await this.sessionsRepository.findOne({
      where: { id },
      relations: ['exercise'],
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    if (session.userId !== userId)
      throw new ForbiddenException('No autorizado');
    return session;
  }

  async create(userId: string, dto: CreateSessionDto): Promise<SessionLog> {
    const exercise = await this.exercisesRepository.findOne({
      where: { id: dto.exerciseId },
    });
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');
    if (exercise.userId !== userId)
      throw new ForbiddenException('No autorizado');

    const totalDurationSec =
      dto.totalDurationSec ??
      (exercise.durationPerSetSec
        ? exercise.durationPerSetSec * dto.setsCompleted
        : 0);
    const totalReps =
      dto.totalReps ??
      (exercise.repsPerSet ? exercise.repsPerSet * dto.setsCompleted : 0);

    const session = this.sessionsRepository.create({
      userId,
      exerciseId: dto.exerciseId,
      performedAt: dto.performedAt ? new Date(dto.performedAt) : new Date(),
      setsCompleted: dto.setsCompleted,
      totalDurationSec,
      totalReps,
      notes: dto.notes ?? null,
    });
    return this.sessionsRepository.save(session);
  }
}
