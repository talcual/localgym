import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../../database/types';

/**
 * Verifica que el `role` del JWT del usuario actual esté incluido en los roles
 * declarados con `@Roles(...)`. Si no hay roles declarados, deja pasar.
 *
 * Debe combinarse con `JwtAuthGuard` (que pone `request.user`):
 *
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = ctx.switchToHttp().getRequest();
    const user = request.user as { role?: UserRole } | undefined;
    if (!user || !user.role) {
      throw new ForbiddenException('Sin rol asignado');
    }
    if (!required.includes(user.role)) {
      throw new ForbiddenException(
        `Esta acción requiere rol: ${required.join(' | ')}`,
      );
    }
    return true;
  }
}