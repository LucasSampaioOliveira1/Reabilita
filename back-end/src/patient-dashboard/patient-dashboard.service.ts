import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsRepository } from '../patients/repositories/patients.repository';
import { CreatePatientExerciseDto } from './dto/create-patient-exercise.dto';
import { CreatePatientExerciseCheckDto } from './dto/create-patient-exercise-check.dto';
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

  private buildSummary(
    painRecords: Array<{ completed: boolean; painLevel: number; date: Date }>,
    exercises: Array<{ completed: boolean }>,
  ) {
    const latestPainRecord = painRecords[0] ?? null;
    const totalExercises = exercises.length;
    const completedExercises = exercises.filter((exercise) => exercise.completed).length;

    return {
      latestPainLevel: latestPainRecord?.painLevel ?? null,
      latestPainAt: latestPainRecord?.date ?? null,
      totalExercises,
      completedExercises,
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

    const { start, end } = this.getTodayRange();
    const [videos, exercises, painRecords, latestInteractions, latestChecks] = await Promise.all([
      this.prisma.patientVideo.findMany({
        where: { patientId },
        orderBy: [{ phase: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.patientExercise.findMany({
        where: { patientId, isActive: true },
        orderBy: [{ phase: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.painRecord.findMany({
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
      this.prisma.patientExerciseCheck.findMany({
        where: { patientId },
        orderBy: { date: 'desc' },
      }),
    ]);

    const latestCheckMap = new Map<
      string,
      { date: Date; completed: boolean }
    >();

    for (const check of latestChecks) {
      if (!latestCheckMap.has(check.exerciseId)) {
        latestCheckMap.set(check.exerciseId, { date: check.date, completed: check.completed });
      }
    }

    const exercisesWithChecks = exercises.map((exercise) => {
      const latest = latestCheckMap.get(exercise.id);
      return {
        ...exercise,
        completed: latest?.completed ?? false,
        lastCheckAt: latest?.date ?? null,
        lastCheckCompleted: latest?.completed ?? null,
      };
    });
    const interactions = [...latestInteractions].reverse();

    const hasTodayPainRecord = painRecords.some(
      (record) => record.date >= start && record.date <= end,
    );

    return {
      patient,
      videos,
      exercises: exercisesWithChecks,
      sessions: painRecords,
      interactions,
      summary: this.buildSummary(painRecords, exercisesWithChecks),
      hasTodayPainRecord,
      notifications: hasTodayPainRecord
        ? ['Seu registro diario de dor (EVA) de hoje ja foi realizado.']
        : ['Lembrete: registre seu nivel de dor (EVA).'],
    };
  }

  async savePatientDailySession(user: JwtUser, dto: CreatePatientSessionDto) {
    this.ensurePatient(user);

    const patient = await this.patientsRepository.findByUserId(user.sub);
    if (!patient) {
      throw new NotFoundException('Perfil de paciente não encontrado.');
    }

    const { start, end } = this.getTodayRange();
    const activeExercises = await this.prisma.patientExercise.findMany({
      where: {
        patientId: patient.id,
        isActive: true,
      },
      select: { id: true },
    });
    const latestChecks = await this.prisma.patientExerciseCheck.findMany({
      where: {
        patientId: patient.id,
        exerciseId: {
          in: activeExercises.map((exercise) => exercise.id),
        },
      },
      orderBy: { date: 'desc' },
    });
    const latestByExercise = new Map<string, boolean>();
    for (const check of latestChecks) {
      if (!latestByExercise.has(check.exerciseId)) {
        latestByExercise.set(check.exerciseId, check.completed);
      }
    }
    const completedAllExercises =
      activeExercises.length > 0 &&
      activeExercises.every((exercise) => latestByExercise.get(exercise.id) === true);

    const existing = await this.prisma.painRecord.findFirst({
      where: {
        patientId: patient.id,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Voce ja realizou o registro diario de dor (EVA) de hoje.',
      );
    }

    const painRecord = await this.prisma.painRecord.create({
      data: {
        patientId: patient.id,
        completed: completedAllExercises,
        painLevel: dto.painLevel,
        date: new Date(),
      },
    });

    return painRecord;
  }

  async savePatientExerciseCheck(
    user: JwtUser,
    exerciseId: string,
    dto: CreatePatientExerciseCheckDto,
  ) {
    this.ensurePatient(user);
    const patient = await this.patientsRepository.findByUserId(user.sub);
    if (!patient) {
      throw new NotFoundException('Perfil de paciente não encontrado.');
    }

    const exercise = await this.prisma.patientExercise.findUnique({
      where: { id: exerciseId },
      select: {
        id: true,
        patientId: true,
      },
    });

    if (!exercise || exercise.patientId !== patient.id) {
      throw new ForbiddenException('Você só pode atualizar exercícios do seu próprio perfil.');
    }

    return this.prisma.patientExerciseCheck.create({
      data: {
        patientId: patient.id,
        exerciseId,
        date: new Date(),
        completed: dto.completed,
      },
    });
  }

  async addPatientInteraction(user: JwtUser, dto: CreatePatientInteractionDto) {
    this.ensurePatient(user);
    const patient = await this.patientsRepository.findByUserId(user.sub);
    if (!patient) {
      throw new NotFoundException('Perfil de paciente não encontrado.');
    }

    return this.prisma.patientInteraction.create({
      data: {
        patientId: patient.id,
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

  async getPhysioChatList(user: JwtUser) {
    this.ensurePhysio(user);

    const patients = await this.prisma.patient.findMany({
      select: {
        id: true,
        condition: true,
        phase: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            loginCode: true,
          },
        },
        interactions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            note: true,
            createdAt: true,
            author: {
              select: {
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return patients
      .map((patient) => ({
        patientId: patient.id,
        patientName: patient.user.name,
        loginCode: patient.user.loginCode,
        condition: patient.condition,
        phase: patient.phase,
        status: patient.status,
        latestMessage: patient.interactions[0]
          ? {
              note: patient.interactions[0].note,
              createdAt: patient.interactions[0].createdAt,
              author: patient.interactions[0].author,
            }
          : null,
        sortDate: patient.interactions[0]?.createdAt ?? patient.createdAt,
      }))
      .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
      .map(({ sortDate: _sortDate, ...chat }) => chat);
  }

  async getPhysioChatConversation(user: JwtUser, patientId: string) {
    this.ensurePhysio(user);

    const patient = await this.patientsRepository.findById(patientId);
    if (!patient) {
      throw new NotFoundException('Paciente nao encontrado.');
    }

    const interactions = await this.prisma.patientInteraction.findMany({
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
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return {
      patient: {
        id: patient.id,
        name: patient.user.name,
        loginCode: patient.user.loginCode,
        condition: patient.condition,
        phase: patient.phase,
        status: patient.status,
      },
      interactions,
    };
  }

  async sendPhysioChatMessage(
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
      ['Dor (EVA)', String(report.summary.latestPainLevel ?? 'Sem registro')],
      ['Último registro de dor', report.summary.latestPainAt ? new Date(report.summary.latestPainAt).toLocaleString('pt-BR') : 'Sem registro'],
      ['Exercícios concluídos', String(report.summary.completedExercises)],
      ['Total de exercícios', String(report.summary.totalExercises)],
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
