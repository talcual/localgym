import { useCallback, useEffect, useRef, useState } from 'react';
import { api, loadAuthToken } from './client';

// ──────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ──────────────────────────────────────────────────────────────────────────────

export type OllamaRole = 'system' | 'user' | 'assistant';

export interface OllamaMessage {
  role: OllamaRole;
  content: string;
}

export interface OllamaChatRequest {
  model?: string;
  messages?: OllamaMessage[];
  prompt?: string;
  system?: string;
}

export type OllamaStreamEvent =
  | { type: 'chunk'; data: { text: string } }
  | {
      type: 'done';
      data: {
        model?: string;
        done_reason?: string;
        total_duration?: number;
        prompt_eval_count?: number;
        eval_count?: number;
      };
    }
  | { type: 'error'; data: { message: string } };

/** Callback que recibe cada evento del stream. */
export type OllamaEventHandler = (evt: OllamaStreamEvent) => void;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers internos
// ──────────────────────────────────────────────────────────────────────────────

const envPrefix = (import.meta.env.VITE_API_PREFIX as string | undefined) || '/api';
const envBase = (import.meta.env.VITE_API_URL as string | undefined) || '';

/** URL absoluta para POST SSE — fetch nativo no usa baseURL de axios. */
function resolveStreamUrl(): string {
  const path = '/ollama/chat';
  if (envBase && envBase.length > 0) return `${envBase.replace(/\/+$/, '')}${path}`;
  return `${envPrefix.replace(/\/+$/, '')}${path}`;
}

/** Construye las opciones del fetch SSE con el JWT actual. */
function buildStreamInit(body: OllamaChatRequest): RequestInit {
  const token = loadAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    credentials: 'include',
    cache: 'no-store',
  };
}

/** Parsea un bloque SSE (event:/data:/líneas vacías). */
function parseSseBlock(block: string): OllamaStreamEvent | null {
  const lines = block.split('\n');
  let eventName = 'message';
  let dataLine = '';
  for (const line of lines) {
    if (line.startsWith(':')) continue; // comentario / heartbeat
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLine += line.slice(5).trim();
  }
  if (!dataLine) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(dataLine);
  } catch {
    parsed = { raw: dataLine };
  }
  // Cast seguro: el backend solo emite 3 tipos.
  if (eventName === 'chunk') {
    return { type: 'chunk', data: { text: String((parsed as { text?: string }).text ?? '') } };
  }
  if (eventName === 'done') {
    return { type: 'done', data: parsed as OllamaStreamEvent extends { type: 'done'; data: infer D } ? D : never };
  }
  if (eventName === 'error') {
    return {
      type: 'error',
      data: { message: String((parsed as { message?: string }).message ?? 'Error desconocido') },
    };
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Cliente plano (sin React)
// ──────────────────────────────────────────────────────────────────────────────

export interface StreamChatHandle {
  abort: () => void;
  done: Promise<void>;
}

/**
 * Suscribe a un stream SSE y delega cada evento en `onEvent`.
 * Devuelve un handle para cancelar y una promesa que se resuelve al finalizar.
 *
 * Uso típico:
 * ```ts
 * const handle = streamChat({ messages }, (evt) => { ... });
 * // ...
 * handle.abort();
 * await handle.done;
 * ```
 */
export function streamChat(
  req: OllamaChatRequest,
  onEvent: OllamaEventHandler,
  signal?: AbortSignal,
): StreamChatHandle {
  const ctrl = new AbortController();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }

  const done = (async () => {
    let res: Response;
    try {
      res = await fetch(resolveStreamUrl(), {
        ...buildStreamInit(req),
        signal: ctrl.signal,
      });
    } catch (err) {
      onEvent({ type: 'error', data: { message: (err as Error).message } });
      return;
    }

    if (!res.ok || !res.body) {
      onEvent({
        type: 'error',
        data: {
          message: `HTTP ${res.status} ${res.statusText || ''}`.trim(),
        },
      });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { value, done: finished } = await reader.read();
        if (finished) break;
        buffer += decoder.decode(value, { stream: true });

        // Los eventos SSE se separan por doble newline.
        let sep = buffer.indexOf('\n\n');
        while (sep !== -1) {
          const block = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const evt = parseSseBlock(block);
          if (evt) {
            onEvent(evt);
            if (evt.type === 'done' || evt.type === 'error') return;
          }
          sep = buffer.indexOf('\n\n');
        }
      }
      // Procesar bloque final si quedó sin doble newline.
      if (buffer.trim().length > 0) {
        const evt = parseSseBlock(buffer);
        if (evt) onEvent(evt);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onEvent({ type: 'error', data: { message: (err as Error).message } });
      }
    }
  })();

  return {
    abort: () => ctrl.abort(),
    done,
  };
}

/** Helper one-shot: junta todos los chunks en un solo string. */
export async function streamChatToString(
  req: OllamaChatRequest,
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  let acc = '';
  const handle = streamChat(
    req,
    (evt) => {
      if (evt.type === 'chunk') {
        acc += evt.data.text;
        onChunk?.(evt.data.text);
      }
    },
    signal,
  );
  await handle.done;
  return acc;
}

/** Lista los modelos disponibles (no streamea). */
export function listOllamaModels(): Promise<{ models: string[] }> {
  return api.get<{ models: string[] }>('/ollama/models').then((r) => r.data);
}

/**
 * Pide al backend que llame a Ollama en modo "format: json" para extraer
 * una versión estructurada de la respuesta (p.ej. una rutina con IDs de
 * catálogo). Devuelve el objeto parseado tal cual lo emite el modelo.
 *
 * `schemaHint` debe ser un JSONSchema mínimo (sólo lo necesita el backend
 * para reenviarlo al campo `format` de Ollama).
 */
export function ollamaStructuredJson(args: {
  model?: string;
  system: string;
  prompt: string;
  schemaHint: Record<string, unknown>;
}): Promise<unknown> {
  return api
    .post<unknown>('/ollama/structured', args)
    .then((r) => r.data);
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook de React: useOllamaStream
// ──────────────────────────────────────────────────────────────────────────────

export interface UseOllamaStreamOptions {
  /** Request a enviar. Si es `null`, el hook queda idle. */
  request: OllamaChatRequest | null;
  /** Se llama al terminar (done o error). */
  onComplete?: (fullText: string) => void;
}

export interface UseOllamaStreamResult {
  /** Texto acumulado hasta el momento. */
  text: string;
  /** Último fragmento recibido (útil para animar). */
  delta: string;
  /** True mientras el stream está abierto. */
  streaming: boolean;
  /** Mensaje de error si lo hubo. */
  error: string | null;
  /** Cancela el stream en curso. */
  abort: () => void;
  /** Limpia el estado (text/delta/error). */
  reset: () => void;
}

/**
 * Hook todo-en-uno para conversar con Ollama desde React.
 *
 * ```tsx
 * const { text, streaming, error, abort } = useOllamaStream({
 *   request: { messages: [{ role: 'user', content: prompt }] },
 * });
 * ```
 */
export function useOllamaStream(opts: UseOllamaStreamOptions): UseOllamaStreamResult {
  const { request, onComplete } = opts;
  const [text, setText] = useState('');
  const [delta, setDelta] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRef = useRef<StreamChatHandle | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const abort = useCallback(() => {
    handleRef.current?.abort();
    handleRef.current = null;
    setStreaming(false);
  }, []);

  const reset = useCallback(() => {
    abort();
    setText('');
    setDelta('');
    setError(null);
  }, [abort]);

  useEffect(() => {
    if (!request) return;
    // Resetea estado para la nueva petición.
    setText('');
    setDelta('');
    setError(null);
    setStreaming(true);

    const accRef = { value: '' };

    const handle = streamChat(request, (evt) => {
      if (evt.type === 'chunk') {
        accRef.value += evt.data.text;
        setDelta(evt.data.text);
        setText(accRef.value);
      } else if (evt.type === 'error') {
        setError(evt.data.message);
        setStreaming(false);
      } else if (evt.type === 'done') {
        setStreaming(false);
        onCompleteRef.current?.(accRef.value);
      }
    });
    handleRef.current = handle;

    return () => {
      handle.abort();
      handleRef.current = null;
      setStreaming(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(request)]);

  return { text, delta, streaming, error, abort, reset };
}
