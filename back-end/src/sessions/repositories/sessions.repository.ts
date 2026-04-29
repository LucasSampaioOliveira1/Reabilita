import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    patientId: string;
    completed: boolean;
    painLevel: number;
    date: Date;
  }) {
    return this.prisma.session.create({
      data,
      include: {
        patient: true,
      },
    });
  }

  findAll(patientId?: string) {
    return this.prisma.session.findMany({
      where: patientId ? { patientId } : undefined,
      include: {
        patient: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  findById(id: string) {
    return this.prisma.session.findUnique({
      where: { id },
      include: {
        patient: true,
      },
    });
  }
}
