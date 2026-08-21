import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() current: { userId: string; role: string }) {
    const user = await this.usersService.findById(current.userId);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isInstructor: user.isInstructor,
      heightCm: user.heightCm,
      sex: user.sex,
      birthdate: user.birthdate,
      createdAt: user.createdAt,
    };
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() current: { userId: string },
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(current.userId, dto);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      heightCm: user.heightCm,
      sex: user.sex,
      birthdate: user.birthdate,
      createdAt: user.createdAt,
    };
  }
}
