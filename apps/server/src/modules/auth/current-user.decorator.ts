import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../database/types';

/**
 * Inyecta el usuario autenticado del JWT.
 *
 *   @CurrentUser() user               → { userId, email, role }
 *   @CurrentUser('userId') userId     → solo el id
 *
 * Mantiene retrocompatibilidad: cuando el JWT no incluye `role` (tokens
 * emitidos antes de esta migración), devuelve 'CLIENT'.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUserShape | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = (request.user ?? {}) as AuthenticatedUserShape;
    return data ? user[data] : user;
  },
);

export interface AuthenticatedUserShape {
  userId: string;
  email: string;
  role: UserRole;
}
