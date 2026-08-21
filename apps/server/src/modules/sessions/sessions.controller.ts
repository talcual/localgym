import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '../../database/types';
import { SessionsService, ListSessionsFilter } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  list(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('exerciseId') exerciseId?: string,
  ) {
    const acting = clientId ?? current.userId;
    const filter: ListSessionsFilter = { from, to, exerciseId };
    return this.sessionsService.list(
      current.userId,
      current.role,
      acting,
      filter,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Param('id') id: string,
  ) {
    return this.sessionsService.findOne(current.userId, current.role, id);
  }

  @Post()
  create(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId: string | undefined,
    @Body() dto: CreateSessionDto,
  ) {
    const target = clientId ?? current.userId;
    return this.sessionsService.create(current.userId, current.role, target, dto);
  }
}