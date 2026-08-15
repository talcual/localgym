import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const ROUTINE_GOALS = ['strength', 'hypertrophy', 'fat_loss', 'endurance'] as const;
export const ROUTINE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export class RoutineItemDto {
  @IsInt()
  @Min(0)
  @Max(5)
  dayIndex: number;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  dayLabel: string;

  @IsOptional()
  @IsString()
  exerciseId?: string;

  @IsOptional()
  @IsString()
  catalogId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sets?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reps?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationPerSetSec?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  restSec?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string;
}

export class CreateRoutineDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @IsIn(ROUTINE_GOALS)
  goal: (typeof ROUTINE_GOALS)[number];

  @IsIn(ROUTINE_LEVELS)
  level: (typeof ROUTINE_LEVELS)[number];

  @IsInt()
  @Min(3)
  @Max(6)
  daysPerWeek: number;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  summary?: string;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => RoutineItemDto)
  items: RoutineItemDto[];
}
