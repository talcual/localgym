import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('threads')
  threads(@CurrentUser() current: { userId: string }) {
    return this.messagesService.listThreads(current.userId);
  }

  @Get('threads/:userId')
  thread(
    @CurrentUser() current: { userId: string },
    @Param('userId') userId: string,
  ) {
    return this.messagesService.listWith(current.userId, userId);
  }

  @Post('threads/:userId/read')
  markRead(
    @CurrentUser() current: { userId: string },
    @Param('userId') userId: string,
  ) {
    return this.messagesService.markRead(current.userId, userId);
  }

  @Post()
  send(
    @CurrentUser() current: { userId: string },
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.send(current.userId, dto);
  }
}