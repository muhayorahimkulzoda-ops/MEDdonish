import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { SubscriberPayload } from '../auth/jwt.strategy';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { LessonAccessService } from '../media/lesson-access.service';
import { TestEngineService } from './test-engine.service';
import { AnswerAttemptDto } from './testing.dto';

@ApiTags('tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TestingController {
  constructor(
    private readonly engine: TestEngineService,
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly access: LessonAccessService,
  ) {}

  @Post('tests/:id/start')
  async start(
    @Param('id') id: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    await this.assertCanStart(req.user.userId, id);
    return this.engine.start(req.user.userId, id);
  }

  @Get('test-attempts/:id/question')
  question(
    @Param('id') id: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    return this.engine.currentQuestion(id, req.user.userId);
  }

  @Post('test-attempts/:id/answer')
  answer(
    @Param('id') id: string,
    @Body() body: AnswerAttemptDto,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    return this.engine.answer(id, req.user.userId, body.selectedCodes, body.timedOut);
  }

  @Post('test-attempts/:id/finish')
  finish(
    @Param('id') id: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    return this.engine.finish(id, req.user.userId);
  }

  @Get('test-attempts/:id/result')
  result(
    @Param('id') id: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    return this.engine.result(id, req.user.userId);
  }

  private async assertCanStart(userId: string, testId: string) {
    await this.access.assertCanTakeTest(userId, testId);
  }
}
