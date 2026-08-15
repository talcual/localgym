import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsObject,
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
 *
 * Estrategia de dos pasos: el cliente streameó primero el plan en texto
 * plano y nos lo reenvía en `planText`. El backend hace una segunda
 * llamada a Ollama con un prompt de "convertir este plan a JSON" usando
 * el `schemaHint` como `format`.
 */
export class StructuredChatDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  /** System original usado para generar el plan en texto plano. */
  @IsOptional()
  @IsString()
  @MaxLength(8_000)
  system?: string;

  /** Prompt original usado para generar el plan (referencia). */
  @IsOptional()
  @IsString()
  @MaxLength(16_000)
  prompt?: string;

  /** Texto del plan ya streameado al usuario. Es lo que convertiremos a JSON. */
  @IsString()
  @MaxLength(16_000)
  planText: string;

  /** JSONSchema mínimo que describe la forma esperada. */
  @IsOptional()
  @IsObject()
  schemaHint?: Record<string, unknown>;
}
