import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '../../database/types';
import { RoutinesService } from './routines.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { ReplaceItemsDto } from './dto/replace-items.dto';

@UseGuards(JwtAuthGuard)
@Controller('routines')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  /**
   * `clientId` opcional. Si viene, el caller debe tener acceso al cliente
   * (ser él mismo o un instructor con relación ACTIVE).
   */
  @Get()
  list(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
  ) {
    const actingUserId = clientId ?? current.userId;
    return this.routinesService.list(
      current.userId,
      current.role,
      actingUserId,
    );
  }

  @Get('active')
  active(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
  ) {
    const actingUserId = clientId ?? current.userId;
    return this.routinesService.getActive(
      current.userId,
      current.role,
      actingUserId,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Param('id') id: string,
  ) {
    return this.routinesService.findOne(current.userId, current.role, id);
  }

  @Post()
  create(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId: string | undefined,
    @Body() dto: CreateRoutineDto,
  ) {
    const targetUserId = clientId ?? current.userId;
    return this.routinesService.create(
      current.userId,
      current.role,
      targetUserId,
      dto,
    );
  }

  @Patch(':id')
  update(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Param('id') id: string,
    @Body() dto: UpdateRoutineDto,
  ) {
    return this.routinesService.update(
      current.userId,
      current.role,
      id,
      dto,
    );
  }

  @Put(':id/items')
  replaceItems(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Param('id') id: string,
    @Body() dto: ReplaceItemsDto,
  ) {
    return this.routinesService.replaceItems(
      current.userId,
      current.role,
      id,
      dto,
    );
  }

  @Patch(':id/activate')
  activate(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Param('id') id: string,
  ) {
    return this.routinesService.activate(current.userId, current.role, id);
  }

  @Post('deactivate')
  deactivate(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Query('clientId') clientId?: string,
  ) {
    const actingUserId = clientId ?? current.userId;
    return this.routinesService.deactivate(
      current.userId,
      current.role,
      actingUserId,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser() current: { userId: string; role: UserRole },
    @Param('id') id: string,
  ) {
    return this.routinesService.remove(current.userId, current.role, id);
  }
}
