import { IsString, MinLength } from 'class-validator';

export class PatientLoginDto {
  @IsString()
  loginCode!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
