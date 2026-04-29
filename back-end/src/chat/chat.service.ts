import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../users/repositories/users.repository';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatRepository } from './repositories/chat.repository';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async sendMessage(dto: SendMessageDto) {
    if (dto.senderId === dto.receiverId) {
      throw new BadRequestException('Remetente e destinatário devem ser diferentes.');
    }

    const sender = await this.usersRepository.findById(dto.senderId);
    const receiver = await this.usersRepository.findById(dto.receiverId);

    if (!sender || !receiver) {
      throw new NotFoundException('Usuários da conversa não encontrados.');
    }

    return this.chatRepository.create(dto);
  }

  findConversation(userId: string, peerId: string) {
    return this.chatRepository.findConversation(userId, peerId);
  }
}
