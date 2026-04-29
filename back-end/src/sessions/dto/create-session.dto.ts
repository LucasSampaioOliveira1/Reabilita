import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @Type(() => Boolean)
  @IsBoolean()
  completed!: boolean;

  @IsInt()
  @Min(0)
  @Max(10)
  painLevel!: number;

  @IsDateString()
  date!: string;
}
