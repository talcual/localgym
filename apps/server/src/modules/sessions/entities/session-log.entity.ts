import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { Exercise } from '../../exercises/entities/exercise.entity';

@Entity('session_logs')
export class SessionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'exercise_id' })
  exerciseId: string;

  @ManyToOne(() => Exercise, (exercise) => exercise.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ name: 'performed_at', type: 'datetime' })
  performedAt: Date;

  @Column({ name: 'sets_completed', type: 'integer' })
  setsCompleted: number;

  @Column({ name: 'total_duration_sec', type: 'integer', default: 0 })
  totalDurationSec: number;

  @Column({ name: 'total_reps', type: 'integer', default: 0 })
  totalReps: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
