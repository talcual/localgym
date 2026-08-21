import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../database/types';

export const ROLES_KEY = 'roles';

/**
 * Marca un controller o método con los roles que pueden acceder.
 * Usar junto con `RolesGuard`.
 *
 * @example
 *   @Roles('INSTRUCTOR', 'ADMIN')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Get('clients')
 *   ...
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);