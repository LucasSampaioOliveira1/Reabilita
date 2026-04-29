import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post()
  create(@Body() dto: CreateExerciseDto) {
    return this.exercisesService.create(dto);
  }

  @Get()
  findAll(@Query('phase') phase?: string) {
    return this.exercisesService.findAll(phase ? Number(phase) : undefined);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.exercisesService.findById(id);
  }
}
