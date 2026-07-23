import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { EXERCISE_TYPES, ExerciseType } from '../../../database/types';

export class CreateExerciseDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(EXERCISE_TYPES)
  type: ExerciseType;

  @IsInt()
  @Min(1)
  sets: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationPerSetSec?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  repsPerSet?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  restSec?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
