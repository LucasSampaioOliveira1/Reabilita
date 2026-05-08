import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PatientsModule } from '../patients/patients.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PatientDashboardController } from './patient-dashboard.controller';
import { PatientDashboardService } from './patient-dashboard.service';

@Module({
  imports: [PrismaModule, PatientsModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [PatientDashboardController],
  providers: [PatientDashboardService],
})
export class PatientDashboardModule {}
