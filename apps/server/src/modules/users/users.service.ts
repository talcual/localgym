import { Inject, Injectable } from '@nestjs/common';
import { Client } from '@libsql/client';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcrypt';

import { DATABASE } from '../../database/database.tokens';
import { Sex, User } from '../../database/types';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private readonly db: Client) {}

  async findByEmail(email: string): Promise<User | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email],
    });
    const row = res.rows[0];
    return row ? mapUser(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const res = await this.db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id],
    });
    const row = res.rows[0];
    return row ? mapUser(row) : null;
  }

  async create(
    email: string,
    password: string,
    displayName: string,
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuid();
    await this.db.execute({
      sql: 'INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
      args: [id, email, passwordHash, displayName],
    });
    const user = await this.findById(id);
    if (!user) throw new Error('Error al crear usuario');
    return user;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const existing = await this.findById(userId);
    if (!existing) throw new Error('Usuario no encontrado');

    const heightCm = dto.heightCm === undefined ? existing.heightCm : dto.heightCm;
    const sex = dto.sex === undefined ? existing.sex : dto.sex;
    const birthdate =
      dto.birthdate === undefined ? existing.birthdate : dto.birthdate;
    const displayName =
      dto.displayName === undefined ? existing.displayName : dto.displayName;

    await this.db.execute({
      sql: `UPDATE users SET
        display_name = ?, height_cm = ?, sex = ?, birthdate = ?
        WHERE id = ?`,
      args: [displayName, heightCm, sex, birthdate, userId],
    });

    const updated = await this.findById(userId);
    if (!updated) throw new Error('Error al actualizar perfil');
    return updated;
  }
}

function mapUser(row: any): User {
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    displayName: String(row.display_name),
    heightCm: row.height_cm == null ? null : Number(row.height_cm),
    sex: (row.sex ?? null) as Sex | null,
    birthdate: row.birthdate == null ? null : String(row.birthdate),
    createdAt: String(row.created_at),
  };
}
