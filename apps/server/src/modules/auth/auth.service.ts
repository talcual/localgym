import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }
    const user = await this.usersService.create(
      dto.email,
      dto.password,
      dto.displayName,
    );
    return this.buildAuthResponse(user.id, user.email, user.displayName);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const valid = await this.usersService.validatePassword(user, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.buildAuthResponse(user.id, user.email, user.displayName);
  }

  private buildAuthResponse(id: string, email: string, displayName: string) {
    const payload = { sub: id, email };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      user: { id, email, displayName },
    };
  }
}
