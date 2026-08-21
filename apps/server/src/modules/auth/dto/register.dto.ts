import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { USER_ROLES, UserRole } from '../../../database/types';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  displayName: string;

  /**
   * Rol del usuario. Solo se acepta 'CLIENT' o 'INSTRUCTOR' en el registro público.
   * 'ADMIN' se omite siempre (forbidNonWhitelisted lo bloquea).
   */
  @IsOptional()
  @IsIn([USER_ROLES[0], USER_ROLES[1]])
  role?: UserRole;
}
