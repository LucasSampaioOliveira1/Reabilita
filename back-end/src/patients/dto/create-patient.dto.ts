import { IsDateString, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  cpf!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsDateString()
  birthDate!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  condition!: string;
}
