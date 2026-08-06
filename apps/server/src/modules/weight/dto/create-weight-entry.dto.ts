import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateWeightEntryDto {
  @IsNumber()
  @Min(20)
  @Max(500)
  weightKg: number;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
