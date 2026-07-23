import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ExerciseType } from '../exercise-type.enum';

export class CreateExerciseDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(ExerciseType)
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
