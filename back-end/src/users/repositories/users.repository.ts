import { Injectable } from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  private readonly publicSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
  }) {
    return this.prisma.user.create({
      data,
      select: this.publicSelect,
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: this.publicSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.publicSelect,
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
}
