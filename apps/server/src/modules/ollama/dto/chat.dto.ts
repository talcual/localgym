import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const OLLAMA_MESSAGE_ROLES = ['system', 'user', 'assistant'] as const;
export type OllamaMessageRole = (typeof OLLAMA_MESSAGE_ROLES)[number];

export class OllamaChatMessageDto {
  @IsIn(OLLAMA_MESSAGE_ROLES)
  role: OllamaMessageRole;

  @IsString()
  @MaxLength(32_000)
  content: string;
}

export class ChatDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(64)
  @ValidateNested({ each: true })
  @Type(() => OllamaChatMessageDto)
  messages?: OllamaChatMessageDto[];

  @IsOptional()
  @IsString()
  @MaxLength(8_000)
  prompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8_000)
  system?: string;
}

/**
 * Para pedirle a Ollama un JSON estructurado con IDs concretos de ejercicios.
 * El cliente debe pasar un `schemaHint` (objeto JSONSchema mínimo) que
 * documente qué claves se esperan. El backend lo reenvía tal cual al
 * parámetro `format` de /api/generate.
 */
export class StructuredChatDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsString()
  @MaxLength(8_000)
  system: string;

  @IsString()
  @MaxLength(16_000)
  prompt: string;

  /** JSONSchema mínimo que describe la forma esperada. */
  schemaHint: Record<string, unknown>;
}
