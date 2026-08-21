import { IsUUID } from 'class-validator';

export class RevokeClientDto {
  @IsUUID()
  clientId: string;
}