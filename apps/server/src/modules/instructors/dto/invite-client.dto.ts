import { IsEmail, IsIn, IsOptional } from 'class-validator';
import { INVITATION_KINDS, InvitationKind } from '../../../database/types';

export class InviteClientDto {
  @IsEmail()
  email: string;

  /** 'EMAIL' para invitación clásica por enlace, 'CODE' para código compartible. */
  @IsOptional()
  @IsIn([INVITATION_KINDS[0], INVITATION_KINDS[1]])
  kind?: InvitationKind;
}