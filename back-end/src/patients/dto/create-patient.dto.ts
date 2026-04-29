import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsInt()
  @Min(1)
  age!: number;

  @IsString()
  @IsNotEmpty()
  condition!: string;

  @IsInt()
  @Min(1)
  @Max(3)
  phase!: number;
}
