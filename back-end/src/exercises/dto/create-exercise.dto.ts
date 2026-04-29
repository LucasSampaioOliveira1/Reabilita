import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class CreateExerciseDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUrl()
  videoUrl!: string;

  @IsInt()
  @Min(1)
  @Max(3)
  phase!: number;
}
