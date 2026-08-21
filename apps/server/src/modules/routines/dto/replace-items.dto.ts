import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ReplaceItemDto {
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

export class ReplaceItemsDto {
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => ReplaceItemDto)
  items: ReplaceItemDto[];
}