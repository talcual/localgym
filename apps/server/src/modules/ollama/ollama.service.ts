import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Readable } from 'node:stream';

import { ChatDto } from './dto/chat.dto';

export interface OllamaChunk {
  /** Fragmento de texto que el modelo acaba de emitir. */
  response?: string;
  /** Mensaje completo cuando el chunk viene de /api/chat. */
  message?: { role: string; content: string };
  /** Estado reportado por Ollama: 'true' en el último chunk de un stream. */
  done: boolean;
  /** Modelo que contestó (útil para validar la respuesta). */
  model?: string;
  /** Motivo de finalización cuando done=true. */
  done_reason?: string;
  /** Contexto serializado (para mantener historial de conversación). */
  context?: number[];
  /** Métricas de Ollama cuando done=true. */
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaUpstreamOptions {
  baseUrl: string;
  model: string;
  body: Record<string, unknown>;
  /** Headers extra (p.ej. Authorization para Ollama Cloud). */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);

  private readonly defaultBaseUrl =
    process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

  private readonly defaultModel =
    process.env.OLLAMA_MODEL || 'llama3.1';

  /**
   * API key para Ollama Cloud. Si está presente se envía
   * `Authorization: Bearer <key>` en cada request upstream.
   *
   * En Ollama local (sin auth) se ignora y el header no se agrega.
   */
  private readonly apiKey = (process.env.OLLAMA_API_KEY || '').trim();

  /** Timeout del request upstream hacia Ollama (ms). 0 = sin timeout. */
  private readonly upstreamTimeoutMs = Number(
    process.env.OLLAMA_UPSTREAM_TIMEOUT_MS || 0,
  );

  /**
   * Construye los headers HTTP que enviaremos a Ollama. Si hay API key
   * configurada (Ollama Cloud) se agrega `Authorization: Bearer <key>`.
   */
  private buildUpstreamHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  /**
   * Construye un Readable que emite los eventos SSE listos para enviar al
   * cliente. Cada evento es un objeto JSON con forma { type, data }.
   *
   *   - type: 'chunk'   -> fragmento de texto del modelo
   *   - type: 'done'    -> stream finalizado correctamente
   *   - type: 'error'   -> error reportable al cliente
   *
   * El stream se cancela automáticamente si el cliente cierra la conexión
   * (signal desde el controller) o si el upstream falla.
   */
  streamChat(
    dto: ChatDto,
    signal?: AbortSignal,
  ): Readable {
    const model = (dto.model || this.defaultModel).trim();
    const baseUrl = this.defaultBaseUrl.replace(/\/+$/, '');

    const { endpoint, body } = this.buildRequest(model, dto);
    const url = `${baseUrl}${endpoint}`;
    const headers = this.buildUpstreamHeaders();

    return this.makeUpstreamStream(
      { baseUrl, model, body, headers, signal },
      url,
    );
  }

  /** Versión no-stream: útil para tests o health checks. */
  async listModels(): Promise<string[]> {
    const baseUrl = this.defaultBaseUrl.replace(/\/+$/, '');
    const ctrl = new AbortController();
    const timer =
      this.upstreamTimeoutMs > 0
        ? setTimeout(() => ctrl.abort(), this.upstreamTimeoutMs)
        : null;

    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: ctrl.signal,
        headers: this.buildUpstreamHeaders(),
      });
      if (!res.ok) {
        throw new ServiceUnavailableException(
          `Ollama no disponible (HTTP ${res.status})`,
        );
      }
      const json = (await res.json()) as { models?: Array<{ name: string }> };
      return (json.models || []).map((m) => m.name);
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`listModels fallo: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'No se pudo conectar con Ollama. ¿Está corriendo el servicio?',
      );
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────────────

  private buildRequest(
    model: string,
    dto: ChatDto,
  ): { endpoint: string; body: Record<string, unknown> } {
    if (dto.messages && dto.messages.length > 0) {
      return {
        endpoint: '/api/chat',
        body: {
          model,
          messages: dto.messages,
          stream: true,
        },
      };
    }

    return {
      endpoint: '/api/generate',
      body: {
        model,
        prompt: dto.prompt ?? '',
        system: dto.system,
        stream: true,
      },
    };
  }

  private makeUpstreamStream(
    opts: OllamaUpstreamOptions,
    url: string,
  ): Readable {
    const { signal } = opts;

    // Readable en object mode -> emitimos objetos { type, data }
    const out = new Readable({
      objectMode: true,
      read() {
        /* pull-based; se empuja desde el parser upstream */
      },
    });

    let upstream: Response | null = null;
    let closed = false;

    const safePush = (chunk: unknown) => {
      if (!closed) out.push(chunk);
    };

    const cleanup = (err?: Error) => {
      if (closed) return;
      closed = true;
      if (err) {
        this.logger.warn(`Ollama stream cerrado: ${err.message}`);
        safePush({ type: 'error', data: { message: err.message } });
      }
      out.push(null);
    };

    // Si el cliente (frontend) desconecta, abortamos el fetch upstream.
    const onClientAbort = () => {
      if (upstream && upstream.body) {
        try {
          (upstream.body as ReadableStream<Uint8Array>).cancel().catch(() => {});
        } catch {
          /* noop */
        }
      }
      cleanup(new Error('Cliente cerró la conexión'));
    };
    if (signal) {
      if (signal.aborted) {
        // Síncrono: emitir fin y volver.
        queueMicrotask(() =>
          cleanup(new Error('Cliente cerró la conexión')),
        );
        return out;
      }
      signal.addEventListener('abort', onClientAbort, { once: true });
    }

    // Timeout opcional del lado servidor.
    let timeoutTimer: NodeJS.Timeout | null = null;
    if (this.upstreamTimeoutMs > 0) {
      timeoutTimer = setTimeout(() => {
        cleanup(new Error(`Timeout tras ${this.upstreamTimeoutMs}ms`));
      }, this.upstreamTimeoutMs);
      out.on('close', () => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
      });
    }

    void (async () => {
      try {
        upstream = await fetch(url, {
          method: 'POST',
          headers: opts.headers ?? { 'Content-Type': 'application/json' },
          body: JSON.stringify(opts.body),
          signal,
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => '');
          // Por seguridad, removemos cualquier header sensible del cuerpo
          // por si el upstream incluyera un echo del request.
          const sanitized = this.sanitizeErrorBody(text);
          throw new Error(
            `Ollama respondió HTTP ${upstream.status}: ${sanitized || 'sin cuerpo'}`,
          );
        }

        // Parseamos NDJSON: Ollama envía un JSON por línea en stream mode.
        const reader = (upstream.body as ReadableStream<Uint8Array>)
          .getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        // Quitar listener de abort porque el reader ya reacciona al signal.
        if (signal) signal.removeEventListener('abort', onClientAbort);

        while (!closed) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let nl = buffer.indexOf('\n');
          while (nl !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (line.length > 0) {
              const parsed = this.parseLine(line);
              if (parsed) safePush(parsed);
            }
            nl = buffer.indexOf('\n');
          }
        }

        // Si quedó algo en el buffer sin newline final, intentamos parsearlo.
        if (!closed && buffer.trim().length > 0) {
          const parsed = this.parseLine(buffer.trim());
          if (parsed) safePush(parsed);
        }

        cleanup();
      } catch (err) {
        cleanup(err as Error);
      } finally {
        if (timeoutTimer) clearTimeout(timeoutTimer);
      }
    })();

    return out;
  }

  private parseLine(line: string): { type: string; data: unknown } | null {
    try {
      const json = JSON.parse(line) as OllamaChunk;
      // Si Ollama reporta done, lo emitimos como cierre lógico.
      if (json.done) {
        return {
          type: 'done',
          data: {
            model: json.model,
            done_reason: json.done_reason,
            total_duration: json.total_duration,
            prompt_eval_count: json.prompt_eval_count,
            eval_count: json.eval_count,
          },
        };
      }

      // /api/chat -> json.message.content
      // /api/generate -> json.response
      const text = json.message?.content ?? json.response ?? '';
      if (!text) return null;
      return { type: 'chunk', data: { text } };
    } catch (err) {
      this.logger.warn(`Línea no parseable de Ollama: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Limpia el cuerpo de error devuelto por el upstream para no filtrar
   * accidentalmente el API key si el proxy lo reenviara en algún campo.
   */
  private sanitizeErrorBody(body: string): string {
    if (!body) return '';
    if (!this.apiKey) return body;
    return body
      .split(this.apiKey)
      .join('[REDACTED]')
      .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
  }
}
