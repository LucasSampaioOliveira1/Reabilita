import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PatientsRepository } from './repositories/patients.repository';

@Module({
  imports: [UsersModule],
  controllers: [PatientsController],
  providers: [PatientsService, PatientsRepository],
  exports: [PatientsService, PatientsRepository],
})
export class PatientsModule {}
