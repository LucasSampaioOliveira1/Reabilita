import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.sessionsService.create(dto);
  }

  @Get()
  findAll(@Query('patientId') patientId?: string) {
    return this.sessionsService.findAll(patientId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.sessionsService.findById(id);
  }
}
