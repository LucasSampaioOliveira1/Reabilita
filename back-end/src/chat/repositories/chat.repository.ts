import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { senderId: string; receiverId: string; content: string }) {
    return this.prisma.message.create({ data });
  }

  findConversation(userId: string, peerId: string) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: peerId },
          { senderId: peerId, receiverId: userId },
        ],
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
  }
}
