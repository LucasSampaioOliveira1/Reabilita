import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { UsersRepository } from '../users/repositories/users.repository';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsRepository } from './repositories/patients.repository';

function generateLoginCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

@Injectable()
export class PatientsService {
  constructor(
    private readonly patientsRepository: PatientsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(dto: CreatePatientDto) {
    const existingCpf = await this.patientsRepository.findByCpf(dto.cpf);

    if (existingCpf) {
      throw new ConflictException('CPF já cadastrado.');
    }

    let loginCode = generateLoginCode();
    let existingLogin = await this.usersRepository.findByLoginCode(loginCode);

    while (existingLogin) {
      loginCode = generateLoginCode();
      existingLogin = await this.usersRepository.findByLoginCode(loginCode);
    }

    const passwordHash = await hash(dto.password, 10);
    const birthDate = new Date(dto.birthDate);
    const age = calculateAge(birthDate);

    const user = await this.usersRepository.create({
      name: dto.name,
      email: `patient_${loginCode}@reabilita.com`,
      passwordHash,
      role: 'patient',
      loginCode,
    });

    const patient = await this.patientsRepository.create({
      userId: user.id,
      cpf: dto.cpf,
      phone: dto.phone,
      address: dto.address,
      birthDate,
      age,
      condition: dto.condition,
      phase: 1,
    });

    return {
      ...patient,
      loginCode,
    };
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

  async update(id: string, dto: UpdatePatientDto) {
    const existingPatient = await this.patientsRepository.findById(id);

    if (!existingPatient) {
      throw new NotFoundException('Paciente não encontrado.');
    }

    if (dto.cpf && dto.cpf !== existingPatient.cpf) {
      const patientWithCpf = await this.patientsRepository.findByCpf(dto.cpf);
      if (patientWithCpf && patientWithCpf.id !== id) {
        throw new ConflictException('CPF já cadastrado.');
      }
    }

    const birthDate = dto.birthDate ? new Date(dto.birthDate) : undefined;
    const passwordHash = dto.password
      ? await hash(dto.password, 10)
      : undefined;

    return this.patientsRepository.updateById(id, {
      userName: dto.name,
      userPasswordHash: passwordHash,
      cpf: dto.cpf,
      phone: dto.phone,
      address: dto.address,
      birthDate,
      age: birthDate ? calculateAge(birthDate) : undefined,
      condition: dto.condition,
      phase: dto.phase,
    });
  }

  async remove(id: string) {
    const patient = await this.patientsRepository.findById(id);

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }

    await this.patientsRepository.deleteByUserId(patient.userId);

    return {
      message: 'Paciente excluído com sucesso.',
    };
  }
}
