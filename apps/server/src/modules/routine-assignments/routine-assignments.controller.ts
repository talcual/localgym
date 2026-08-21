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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '../../database/types';
import { RoutineAssignmentsService } from './routine-assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignments')
export class RoutineAssignmentsController {
  constructor(
    private readonly assignmentsService: RoutineAssignmentsService,
  ) {}

  @Roles('INSTRUCTOR', 'ADMIN')
  @Post()
  create(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignmentsService.create(
      current.userId,
      current.role,
      dto,
    );
  }

  @Get()
  list(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId: string,
  ) {
    return this.assignmentsService.listForClient(
      current.userId,
      current.role,
      clientId,
    );
  }

  @Delete(':id')
  archive(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Param('id') id: string,
  ) {
    return this.assignmentsService.archive(current.userId, current.role, id);
  }
}