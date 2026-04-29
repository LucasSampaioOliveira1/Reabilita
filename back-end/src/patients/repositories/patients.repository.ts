import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PatientsRepository {
  private readonly patientSelect = {
    id: true,
    userId: true,
    age: true,
    condition: true,
    phase: true,
    createdAt: true,
    updatedAt: true,
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    },
  } as const;

  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId: string;
    age: number;
    condition: string;
    phase: number;
  }) {
    return this.prisma.patient.create({
      data,
      select: this.patientSelect,
    });
  }

  findAll() {
    return this.prisma.patient.findMany({
      select: this.patientSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findById(id: string) {
    return this.prisma.patient.findUnique({
      where: { id },
      select: this.patientSelect,
    });
  }

  findByUserId(userId: string) {
    return this.prisma.patient.findUnique({
      where: { userId },
      select: this.patientSelect,
    });
  }
}
