import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersRepository } from './repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto) {
    const existingUser = await this.usersRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    const passwordHash = await hash(dto.password, 10);

    return this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role ?? 'patient',
    });
  }

  findAll() {
    return this.usersRepository.findAll();
  }

  async findById(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  findByLoginCode(loginCode: string) {
    return this.usersRepository.findByLoginCode(loginCode);
  }
}
