import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  sendMessage(@Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(dto);
  }

  @Get('messages')
  findConversation(
    @Query('userId') userId?: string,
    @Query('peerId') peerId?: string,
  ) {
    if (!userId || !peerId) {
      throw new BadRequestException('Informe userId e peerId para carregar a conversa.');
    }

    return this.chatService.findConversation(userId, peerId);
  }
}
