import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePatientSessionDto {
  @Type(() => Boolean)
  @IsBoolean()
  completed!: boolean;

  @IsInt()
  @Min(0)
  @Max(10)
  painLevel!: number;

  @IsOptional()
  @IsString()
  interactionNote?: string;
}
