import { Module } from '@nestjs/common';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';
import { ExercisesRepository } from './repositories/exercises.repository';

@Module({
  controllers: [ExercisesController],
  providers: [ExercisesService, ExercisesRepository],
  exports: [ExercisesService, ExercisesRepository],
})
export class ExercisesModule {}
