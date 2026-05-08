import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsRepository } from '../patients/repositories/patients.repository';
import { CreatePatientExerciseDto } from './dto/create-patient-exercise.dto';
import { CreatePatientInteractionDto } from './dto/create-patient-interaction.dto';
import { CreatePatientSessionDto } from './dto/create-patient-session.dto';
import { CreatePatientVideoDto } from './dto/create-patient-video.dto';
import { UpdatePatientExerciseDto } from './dto/update-patient-exercise.dto';

type JwtUser = { sub: string; role: string };

@Injectable()
export class PatientDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsRepository: PatientsRepository,
  ) {}

  private ensurePhysio(user: JwtUser) {
    if (user.role !== 'physio') {
      throw new ForbiddenException('Acesso permitido apenas para fisioterapeutas.');
    }
  }

  private ensurePatient(user: JwtUser) {
    if (user.role !== 'patient') {
      throw new ForbiddenException('Acesso permitido apenas para pacientes.');
    }
  }

  private getTodayRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  private buildSummary(sessions: Array<{ completed: boolean; painLevel: number; date: Date }>) {
    const total = sessions.length;
    const completed = sessions.filter((s) => s.completed).length;
    const adherenceRate = total ? Math.round((completed / total) * 100) : 0;
    const avgPain = total
      ? Number(
          (sessions.reduce((acc, session) => acc + session.painLevel, 0) / total).toFixed(1),
        )
      : 0;

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 28);
    const lastMonthSessions = sessions.filter((session) => session.date >= monthAgo);
    const weeklyFrequency = Number((lastMonthSessions.length / 4).toFixed(1));

    return {
      totalSessions: total,
      completedSessions: completed,
      adherenceRate,
      avgPain,
      weeklyFrequency,
    };
  }

  async getPatientDashboardByUser(userId: string) {
    const patient = await this.patientsRepository.findByUserId(userId);
    if (!patient) {
      throw new NotFoundException('Perfil de paciente não encontrado.');
    }
    return this.getPatientDashboardById(patient.id);
  }

  async getPatientDashboardForProfessional(user: JwtUser, patientId: string) {
    this.ensurePhysio(user);
    return this.getPatientDashboardById(patientId);
  }

  async getPatientDashboardById(patientId: string) {
    const patient = await this.patientsRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }

    const [videos, exercises, sessions, interactions] = await Promise.all([
      this.prisma.patientVideo.findMany({
        where: { patientId },
        orderBy: [{ phase: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.patientExercise.findMany({
        where: { patientId, isActive: true },
        orderBy: [{ phase: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.session.findMany({
        where: { patientId },
        orderBy: { date: 'desc' },
        take: 60,
      }),
      this.prisma.patientInteraction.findMany({
        where: { patientId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const { start, end } = this.getTodayRange();
    const hasTodaySession = sessions.some(
      (session) => session.date >= start && session.date <= end,
    );

    return {
      patient,
      videos,
      exercises,
      sessions,
      interactions,
      summary: this.buildSummary(sessions),
      notifications: hasTodaySession
        ? []
        : ['Lembrete: registre seu checklist diário e nível de dor (EVA).'],
    };
  }

  async savePatientDailySession(user: JwtUser, dto: CreatePatientSessionDto) {
    this.ensurePatient(user);

    const patient = await this.patientsRepository.findByUserId(user.sub);
    if (!patient) {
      throw new NotFoundException('Perfil de paciente não encontrado.');
    }

    const { start, end } = this.getTodayRange();
    const existing = await this.prisma.session.findFirst({
      where: {
        patientId: patient.id,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    const session = existing
      ? await this.prisma.session.update({
          where: { id: existing.id },
          data: {
            completed: dto.completed,
            painLevel: dto.painLevel,
          },
        })
      : await this.prisma.session.create({
          data: {
            patientId: patient.id,
            completed: dto.completed,
            painLevel: dto.painLevel,
            date: new Date(),
          },
        });

    if (dto.interactionNote?.trim()) {
      await this.prisma.patientInteraction.create({
        data: {
          patientId: patient.id,
          authorId: user.sub,
          note: dto.interactionNote.trim(),
        },
      });
    }

    return session;
  }

  async addVideo(user: JwtUser, patientId: string, dto: CreatePatientVideoDto) {
    this.ensurePhysio(user);
    await this.ensurePatientExists(patientId);

    return this.prisma.patientVideo.create({
      data: {
        patientId,
        title: dto.title,
        videoUrl: dto.videoUrl,
        phase: dto.phase ?? 1,
        createdById: user.sub,
      },
    });
  }

  async removeVideo(user: JwtUser, videoId: string) {
    this.ensurePhysio(user);
    await this.ensureVideoExists(videoId);
    await this.prisma.patientVideo.delete({ where: { id: videoId } });
    return { message: 'Vídeo removido com sucesso.' };
  }

  async addExercise(user: JwtUser, patientId: string, dto: CreatePatientExerciseDto) {
    this.ensurePhysio(user);
    await this.ensurePatientExists(patientId);

    return this.prisma.patientExercise.create({
      data: {
        patientId,
        title: dto.title,
        description: dto.description,
        phase: dto.phase ?? 1,
        isActive: true,
      },
    });
  }

  async updateExercise(user: JwtUser, exerciseId: string, dto: UpdatePatientExerciseDto) {
    this.ensurePhysio(user);
    await this.ensureExerciseExists(exerciseId);
    return this.prisma.patientExercise.update({
      where: { id: exerciseId },
      data: dto,
    });
  }

  async removeExercise(user: JwtUser, exerciseId: string) {
    this.ensurePhysio(user);
    await this.ensureExerciseExists(exerciseId);
    await this.prisma.patientExercise.delete({ where: { id: exerciseId } });
    return { message: 'Exercício removido com sucesso.' };
  }

  async addInteraction(
    user: JwtUser,
    patientId: string,
    dto: CreatePatientInteractionDto,
  ) {
    this.ensurePhysio(user);
    await this.ensurePatientExists(patientId);

    return this.prisma.patientInteraction.create({
      data: {
        patientId,
        authorId: user.sub,
        note: dto.note.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  async getPatientReport(user: JwtUser, patientId: string) {
    this.ensurePhysio(user);
    const dashboard = await this.getPatientDashboardById(patientId);
    return {
      generatedAt: new Date(),
      patient: {
        id: dashboard.patient.id,
        name: dashboard.patient.user.name,
        condition: dashboard.patient.condition,
        phase: dashboard.patient.phase,
        status: dashboard.patient.status,
      },
      summary: dashboard.summary,
      sessions: dashboard.sessions,
      interactions: dashboard.interactions,
    };
  }

  async getPatientCsvReport(user: JwtUser, patientId: string) {
    const report = await this.getPatientReport(user, patientId);
    const rows = [
      ['Paciente', report.patient.name],
      ['Condição', report.patient.condition],
      ['Fase', String(report.patient.phase)],
      ['Status', report.patient.status],
      ['Taxa de adesão (%)', String(report.summary.adherenceRate)],
      ['Dor média (EVA)', String(report.summary.avgPain)],
      ['Frequência semanal', String(report.summary.weeklyFrequency)],
      ['Total de sessões', String(report.summary.totalSessions)],
      ['Sessões concluídas', String(report.summary.completedSessions)],
    ];

    const csv = rows.map((row) => row.map((item) => `"${item.replace(/"/g, '""')}"`).join(',')).join('\n');
    return {
      fileName: `relatorio-paciente-${report.patient.id}.csv`,
      content: csv,
    };
  }

  private async ensurePatientExists(patientId: string) {
    const patient = await this.patientsRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }
  }

  private async ensureVideoExists(videoId: string) {
    const video = await this.prisma.patientVideo.findUnique({ where: { id: videoId } });
    if (!video) {
      throw new NotFoundException('Vídeo não encontrado.');
    }
  }

  private async ensureExerciseExists(exerciseId: string) {
    const exercise = await this.prisma.patientExercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      throw new NotFoundException('Exercício não encontrado.');
    }
  }
}
