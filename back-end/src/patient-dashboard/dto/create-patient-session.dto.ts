import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class CreatePatientSessionDto {
  @IsInt()
  @Type(() => Number)
  @Min(0)
  @Max(10)
  painLevel!: number;
}
