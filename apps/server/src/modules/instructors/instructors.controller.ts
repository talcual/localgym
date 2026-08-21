import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { InstructorsService } from './instructors.service';
import { InviteClientDto } from './dto/invite-client.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { UsersService } from '../users/users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('instructors')
export class InstructorsController {
  constructor(
    private readonly instructorsService: InstructorsService,
    private readonly usersService: UsersService,
  ) {}

  /** Instructor: invitar a un cliente por email (devuelve token/link). */
  @Roles('INSTRUCTOR', 'ADMIN')
  @Post('invite')
  async invite(
    @CurrentUser() current: { userId: string },
    @Body() dto: InviteClientDto,
  ) {
    const invitation = await this.instructorsService.invite(
      current.userId,
      dto,
    );
    // En v1 devolvemos el token al instructor para que lo comparta. Más
    // adelante se conectará con un mailer.
    return {
      id: invitation.id,
      email: invitation.clientEmail,
      kind: invitation.kind,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      inviteUrl:
        invitation.kind === 'CODE'
          ? `/join/${invitation.token}`
          : `/api/instructors/accept?token=${invitation.token}`,
    };
  }

  /** Instructor: lista de invitaciones pendientes que ha enviado. */
  @Roles('INSTRUCTOR', 'ADMIN')
  @Get('invitations')
  listInvitations(@CurrentUser() current: { userId: string }) {
    return this.instructorsService.listPendingInvitations(current.userId);
  }

  /** Instructor: clientes (todas las relaciones, incluyendo revocadas). */
  @Roles('INSTRUCTOR', 'ADMIN')
  @Get('clients')
  listClients(@CurrentUser() current: { userId: string }) {
    return this.instructorsService.listClients(current.userId);
  }

  /** Instructor: revocar la relación activa con un cliente. */
  @Roles('INSTRUCTOR', 'ADMIN')
  @Delete('clients/:clientId')
  async revoke(
    @CurrentUser() current: { userId: string },
    @Param('clientId') clientId: string,
  ) {
    await this.instructorsService.revokeInstructor(current.userId, clientId);
    return { ok: true };
  }

  /** Cliente: aceptar una invitación (público a cualquier cliente autenticado). */
  @Post('accept')
  async accept(
    @CurrentUser() current: { userId: string },
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.instructorsService.acceptInvitation(
      current.userId,
      dto.token,
    );
  }

  /** Cliente: invitaciones pendientes para mi email. */
  @Get('pending-for-me')
  async pendingForMe(@CurrentUser() current: { userId: string }) {
    const me = await this.usersService.findById(current.userId);
    if (!me) return [];
    return this.instructorsService.listPendingForClient(me.email);
  }
}