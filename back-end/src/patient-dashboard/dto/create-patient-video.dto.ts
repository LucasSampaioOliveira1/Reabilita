import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreatePatientVideoDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsUrl()
  videoUrl!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  phase?: number;
}
