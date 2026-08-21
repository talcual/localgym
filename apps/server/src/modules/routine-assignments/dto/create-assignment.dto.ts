import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  routineId: string;

  @IsUUID()
  clientId: string;

  /** ISO date 'YYYY-MM-DD'. */
  @IsDateString()
  startDate: string;

  /** ISO date 'YYYY-MM-DD' opcional. Si null, ventana abierta. */
  @IsOptional()
  @IsDateString()
  endDate?: string;
}