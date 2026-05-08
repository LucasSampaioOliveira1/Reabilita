import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreatePatientExerciseDto } from './dto/create-patient-exercise.dto';
import { CreatePatientExerciseCheckDto } from './dto/create-patient-exercise-check.dto';
import { CreatePatientInteractionDto } from './dto/create-patient-interaction.dto';
import { CreatePatientSessionDto } from './dto/create-patient-session.dto';
import { CreatePatientVideoDto } from './dto/create-patient-video.dto';
import { UpdatePatientExerciseDto } from './dto/update-patient-exercise.dto';
import { PatientDashboardService } from './patient-dashboard.service';

type JwtRequest = {
  user: {
    sub: string;
    role: string;
  };
};

@Controller('patient-dashboard')
@UseGuards(AuthGuard('jwt'))
export class PatientDashboardController {
  constructor(private readonly patientDashboardService: PatientDashboardService) {}

  @Get('me')
  getMyDashboard(@Req() req: JwtRequest) {
    return this.patientDashboardService.getPatientDashboardByUser(req.user.sub);
  }

  @Post('me/session')
  saveMyDailySession(
    @Req() req: JwtRequest,
    @Body() dto: CreatePatientSessionDto,
  ) {
    return this.patientDashboardService.savePatientDailySession(req.user, dto);
  }

  @Post('me/exercises/:exerciseId/check')
  updateMyExerciseCheck(
    @Req() req: JwtRequest,
    @Param('exerciseId') exerciseId: string,
    @Body() dto: CreatePatientExerciseCheckDto,
  ) {
    return this.patientDashboardService.savePatientExerciseCheck(req.user, exerciseId, dto);
  }

  @Post('me/interactions')
  addMyInteraction(
    @Req() req: JwtRequest,
    @Body() dto: CreatePatientInteractionDto,
  ) {
    return this.patientDashboardService.addPatientInteraction(req.user, dto);
  }

  @Get('patient/:patientId')
  getPatientDashboard(@Req() req: JwtRequest, @Param('patientId') patientId: string) {
    return this.patientDashboardService.getPatientDashboardForProfessional(
      req.user,
      patientId,
    );
  }

  @Post('patient/:patientId/videos')
  addVideo(
    @Req() req: JwtRequest,
    @Param('patientId') patientId: string,
    @Body() dto: CreatePatientVideoDto,
  ) {
    return this.patientDashboardService.addVideo(req.user, patientId, dto);
  }

  @Delete('videos/:videoId')
  removeVideo(@Req() req: JwtRequest, @Param('videoId') videoId: string) {
    return this.patientDashboardService.removeVideo(req.user, videoId);
  }

  @Post('patient/:patientId/exercises')
  addExercise(
    @Req() req: JwtRequest,
    @Param('patientId') patientId: string,
    @Body() dto: CreatePatientExerciseDto,
  ) {
    return this.patientDashboardService.addExercise(req.user, patientId, dto);
  }

  @Patch('exercises/:exerciseId')
  updateExercise(
    @Req() req: JwtRequest,
    @Param('exerciseId') exerciseId: string,
    @Body() dto: UpdatePatientExerciseDto,
  ) {
    return this.patientDashboardService.updateExercise(req.user, exerciseId, dto);
  }

  @Delete('exercises/:exerciseId')
  removeExercise(@Req() req: JwtRequest, @Param('exerciseId') exerciseId: string) {
    return this.patientDashboardService.removeExercise(req.user, exerciseId);
  }

  @Post('patient/:patientId/interactions')
  addInteraction(
    @Req() req: JwtRequest,
    @Param('patientId') patientId: string,
    @Body() dto: CreatePatientInteractionDto,
  ) {
    return this.patientDashboardService.addInteraction(req.user, patientId, dto);
  }

  @Get('patient/:patientId/report')
  getReport(@Req() req: JwtRequest, @Param('patientId') patientId: string) {
    return this.patientDashboardService.getPatientReport(req.user, patientId);
  }

  @Get('patient/:patientId/report-csv')
  getCsvReport(@Req() req: JwtRequest, @Param('patientId') patientId: string) {
    return this.patientDashboardService.getPatientCsvReport(req.user, patientId);
  }
}
