import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { ExercisesRepository } from './repositories/exercises.repository';

@Injectable()
export class ExercisesService {
  constructor(private readonly exercisesRepository: ExercisesRepository) {}

  create(dto: CreateExerciseDto) {
    return this.exercisesRepository.create(dto);
  }

  findAll(phase?: number) {
    return this.exercisesRepository.findAll(phase);
  }

  async findById(id: string) {
    const exercise = await this.exercisesRepository.findById(id);

    if (!exercise) {
      throw new NotFoundException('Exercício não encontrado.');
    }

    return exercise;
  }
}
