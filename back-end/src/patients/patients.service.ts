import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../users/repositories/users.repository';
import { CreatePatientDto } from './dto/create-patient.dto';
import { PatientsRepository } from './repositories/patients.repository';

@Injectable()
export class PatientsService {
  constructor(
    private readonly patientsRepository: PatientsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(dto: CreatePatientDto) {
    const user = await this.usersRepository.findById(dto.userId);

    if (!user) {
      throw new NotFoundException('Usuário vinculado ao paciente não encontrado.');
    }

    const existingPatient = await this.patientsRepository.findByUserId(dto.userId);

    if (existingPatient) {
      throw new ConflictException('Este usuário já possui cadastro de paciente.');
    }

    return this.patientsRepository.create(dto);
  }

  findAll() {
    return this.patientsRepository.findAll();
  }

  async findById(id: string) {
    const patient = await this.patientsRepository.findById(id);

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }

    return patient;
  }
}
