import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExercisesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    title: string;
    description?: string;
    videoUrl: string;
    phase: number;
  }) {
    return this.prisma.exercise.create({ data });
  }

  findAll(phase?: number) {
    return this.prisma.exercise.findMany({
      where: phase ? { phase } : undefined,
      orderBy: [{ phase: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findById(id: string) {
    return this.prisma.exercise.findUnique({
      where: { id },
    });
  }
}
