import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  exerciseId: string;

  @IsOptional()
  @IsString()
  performedAt?: string;

  @IsInt()
  @Min(0)
  setsCompleted: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalDurationSec?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalReps?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
