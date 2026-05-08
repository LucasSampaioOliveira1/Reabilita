import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePatientInteractionDto {
  @IsString()
  @IsNotEmpty()
  note!: string;
}
