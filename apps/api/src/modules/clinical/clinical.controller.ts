import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { SubscriberPayload } from '../auth/jwt.strategy';
import { ClinicalService } from './clinical.service';
import { AnswerSimpleCaseDto } from './clinical.dto';

@ApiTags('clinical')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ClinicalController {
  constructor(private readonly clinical: ClinicalService) {}

  @Get('situational-tasks/:id')
  async getSimple(
    @Param('id') id: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    await this.clinical.assertCanViewTask(req.user.userId, id);
    return this.clinical.getSimple(id, false);
  }

  @Post('situational-tasks/:id/answer')
  async answerSimple(
    @Param('id') id: string,
    @Body() body: AnswerSimpleCaseDto,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    await this.clinical.assertCanViewTask(req.user.userId, id);
    return this.clinical.answerSimple(id, body);
  }

  @Get('clinical-cases/:id')
  async getCase(
    @Param('id') id: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    await this.clinical.assertCanViewCase(req.user.userId, id);
    return this.clinical.getCase(id, false);
  }

  @Post('clinical-cases/:id/complete')
  async completeCase(
    @Param('id') id: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    await this.clinical.assertCanViewCase(req.user.userId, id);
    return this.clinical.getCase(id, true);
  }

  @Post('clinical-media/:id/view-session')
  viewImage(
    @Param('id') id: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    return this.clinical.viewImage(id, req.user.userId, req.user.userId, false);
  }
}
