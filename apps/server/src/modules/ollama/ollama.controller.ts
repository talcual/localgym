import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Readable } from 'node:stream';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OllamaService } from './ollama.service';
import { ChatDto } from './dto/chat.dto';

interface StreamEvent {
  type: 'chunk' | 'done' | 'error';
  data: unknown;
}

@UseGuards(JwtAuthGuard)
@Controller('ollama')
export class OllamaController {
  private readonly logger = new Logger(OllamaController.name);

  constructor(private readonly ollamaService: OllamaService) {}

  /**
   * Endpoint principal: recibe un body y streama hacia el cliente como
   * text/event-stream (SSE).
   *
   *   POST /api/ollama/chat
   *   Headers: Authorization: Bearer <jwt>
   *   Body:    { model?, messages? | prompt?, system? }
   *   Response: text/event-stream
   *
   * Cada evento se serializa como:
   *   event: <type>
   *   data: <json>
   *
   * Donde <type> ∈ {"chunk", "done", "error"}.
   */
  @Post('chat')
  async chat(
    @CurrentUser() current: { userId: string },
    @Body() dto: ChatDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Headers SSE.
    res.status(HttpStatus.OK);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // desactiva buffering en nginx
    res.flushHeaders?.();

    // Aborta el fetch upstream cuando el cliente cierra la conexión HTTP.
    const ac = new AbortController();
    req.on('close', () => {
      if (!ac.signal.aborted) ac.abort();
    });

    const upstream = this.ollamaService.streamChat(dto, ac.signal);

    // Heartbeat para mantener proxies felices (cada 15s).
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(`: keepalive\n\n`);
      }
    }, 15_000);

    try {
      const node = upstream as unknown as AsyncIterable<StreamEvent> & Readable;
      for await (const evt of node) {
        if (!res.writableEnded) {
          res.write(`event: ${evt.type}\n`);
          res.write(`data: ${JSON.stringify(evt.data ?? null)}\n\n`);
        }
        if (evt.type === 'done' || evt.type === 'error') break;
      }
    } catch (err) {
      this.logger.error(`stream error: ${(err as Error).message}`);
      if (!res.writableEnded) {
        res.write(
          `event: error\ndata: ${JSON.stringify({
            message: (err as Error).message,
          })}\n\n`,
        );
      }
    } finally {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    }
  }

  /** Health check / listado de modelos disponibles en Ollama. */
  @Get('models')
  async models() {
    const models = await this.ollamaService.listModels();
    return { models };
  }
}
