import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePatientExerciseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  phase?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
