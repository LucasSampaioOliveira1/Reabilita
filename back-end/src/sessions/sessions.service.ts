import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PatientsRepository } from '../patients/repositories/patients.repository';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionsRepository } from './repositories/sessions.repository';

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly patientsRepository: PatientsRepository,
  ) {}

  async create(dto: CreateSessionDto) {
    const patient = await this.patientsRepository.findById(dto.patientId);

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado para registrar a sessão.');
    }

    try {
      return await this.sessionsRepository.create({
        patientId: dto.patientId,
        completed: dto.completed,
        painLevel: dto.painLevel,
        date: new Date(dto.date),
      });
    } catch {
      throw new ConflictException('Já existe uma sessão registrada para este paciente nesta data.');
    }
  }

  findAll(patientId?: string) {
    return this.sessionsRepository.findAll(patientId);
  }

  async findById(id: string) {
    const session = await this.sessionsRepository.findById(id);

    if (!session) {
      throw new NotFoundException('Sessão não encontrada.');
    }

    return session;
  }
}
