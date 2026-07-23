import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SessionLog } from '../../sessions/entities/session-log.entity';
import { ExerciseType } from '../exercise-type.enum';

@Entity('exercises')
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.exercises, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column({
    type: 'varchar',
    enum: ExerciseType,
    default: ExerciseType.TIME,
  })
  type: ExerciseType;

  @Column({ type: 'integer', default: 1 })
  sets: number;

  @Column({ name: 'duration_per_set_sec', type: 'integer', nullable: true })
  durationPerSetSec: number | null;

  @Column({ name: 'reps_per_set', type: 'integer', nullable: true })
  repsPerSet: number | null;

  @Column({ name: 'rest_sec', type: 'integer', default: 0 })
  restSec: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => SessionLog, (session) => session.exercise)
  sessions: SessionLog[];
}
