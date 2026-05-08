import { Type } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class CreatePatientExerciseCheckDto {
  @Type(() => Boolean)
  @IsBoolean()
  completed!: boolean;
}
