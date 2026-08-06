import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateMeasurementDto {
  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(250)
  chestCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(250)
  waistCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(250)
  hipsCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  leftArmCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  rightArmCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(150)
  leftThighCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(150)
  rightThighCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  leftCalfCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  rightCalfCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(100)
  neckCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(300)
  shouldersCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(80)
  bodyFatPct?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
