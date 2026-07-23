import { Inject, Injectable } from '@nestjs/common';
import { Client } from '@libsql/client';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcrypt';

import { DATABASE } from '../../database/database.tokens';
import { User } from '../../database/types';

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
}

function mapUser(row: any): User {
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    displayName: String(row.display_name),
    createdAt: String(row.created_at),
  };
}
