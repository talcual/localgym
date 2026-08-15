import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ROUTINE_GOALS, ROUTINE_LEVELS } from './create-routine.dto';

export class UpdateRoutineDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsIn(ROUTINE_GOALS)
  goal?: (typeof ROUTINE_GOALS)[number];

  @IsOptional()
  @IsIn(ROUTINE_LEVELS)
  level?: (typeof ROUTINE_LEVELS)[number];

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(6)
  daysPerWeek?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  summary?: string;
}
