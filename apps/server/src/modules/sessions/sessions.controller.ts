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
import { SessionsService, ListSessionsFilter } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';

@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  list(
    @CurrentUser() current: { userId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('exerciseId') exerciseId?: string,
  ) {
    const filter: ListSessionsFilter = { from, to, exerciseId };
    return this.sessionsService.list(current.userId, filter);
  }

  @Get(':id')
  findOne(
    @CurrentUser() current: { userId: string },
    @Param('id') id: string,
  ) {
    return this.sessionsService.findOne(current.userId, id);
  }

  @Post()
  create(
    @CurrentUser() current: { userId: string },
    @Body() dto: CreateSessionDto,
  ) {
    return this.sessionsService.create(current.userId, dto);
  }
}
