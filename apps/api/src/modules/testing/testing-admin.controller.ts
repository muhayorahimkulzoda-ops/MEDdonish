import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentAdmin } from '../../common/current-admin';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import type { AdminPayload } from '../admin-auth/admin-jwt.strategy';
import { QuestionImportService, type ImportedQuestion } from './question-import.service';
import { TestAdminService } from './test-admin.service';
import { TestEngineService } from './test-engine.service';
import { AnswerAttemptDto, AttachLessonTestDto, CreateTestDto, ImportQuestionsDto, ReplaceLessonTestDto } from './testing.dto';

@ApiTags('admin-tests')
@ApiBearerAuth()
@SkipThrottle()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class TestingAdminController {
  constructor(
    private readonly questions: QuestionImportService,
    private readonly tests: TestAdminService,
    private readonly engine: TestEngineService,
  ) {}

  @Get('questions')
  listQuestions(
    @Query('courseId') courseId?: string,
    @Query('lessonId') lessonId?: string,
    @Query('disciplineId') disciplineId?: string,
  ) {
    return this.tests.listQuestions({ courseId, lessonId, disciplineId });
  }

  @Post('questions/import/preview')
  previewImport(@Body() body: ImportQuestionsDto) {
    return this.questions.preview(body.questions as ImportedQuestion[]);
  }

  @Post('questions/import/confirm')
  confirmImport(@Body() body: ImportQuestionsDto) {
    return this.questions.confirm(body.questions as ImportedQuestion[], {
      language: body.language,
      disciplineId: body.disciplineId,
      courseId: body.courseId,
      sectionId: body.sectionId,
      lessonId: body.lessonId,
    });
  }

  @Get('questions/import/:jobId')
  importJob(@Param('jobId') jobId: string) {
    return this.questions.getJob(jobId);
  }

  @Post('lessons/:lessonId/tests')
  attachLessonTest(
    @CurrentAdmin() admin: AdminPayload,
    @Param('lessonId') lessonId: string,
    @Body() body: AttachLessonTestDto,
    @Req() req: Request,
  ) {
    return this.tests.attachLessonJsonTest(
      admin.adminId,
      lessonId,
      body.questions as ImportedQuestion[],
      body.title,
      req.ip,
    );
  }

  @Put('lessons/:lessonId/tests')
  replaceLessonTest(
    @CurrentAdmin() admin: AdminPayload,
    @Param('lessonId') lessonId: string,
    @Body() body: ReplaceLessonTestDto,
    @Req() req: Request,
  ) {
    return this.tests.replaceLessonJsonTest(
      admin.adminId,
      lessonId,
      (body.questions ?? []) as ImportedQuestion[],
      body.title,
      req.ip,
    );
  }

  @Get('tests')
  listTests() {
    return this.tests.listTests();
  }

  @Post('tests')
  createTest(
    @CurrentAdmin() admin: AdminPayload,
    @Body() body: CreateTestDto,
    @Req() req: Request,
  ) {
    return this.tests.create(admin.adminId, body, req.ip);
  }

  @Get('tests/:id')
  getTest(@Param('id') id: string) {
    return this.tests.getTest(id);
  }

  @Post('tests/:id/preview')
  async previewStart(@Param('id') id: string) {
    const user = await this.tests.previewUser();
    return this.engine.start(user.id, id);
  }

  @Get('test-attempts/:id/question')
  async previewQuestion(@Param('id') id: string) {
    const user = await this.tests.previewUser();
    return this.engine.currentQuestion(id, user.id);
  }

  @Post('test-attempts/:id/answer')
  async previewAnswer(@Param('id') id: string, @Body() body: AnswerAttemptDto) {
    const user = await this.tests.previewUser();
    return this.engine.answer(id, user.id, body.selectedCodes, body.timedOut);
  }

  @Post('test-attempts/:id/finish')
  async previewFinish(@Param('id') id: string) {
    const user = await this.tests.previewUser();
    return this.engine.finish(id, user.id);
  }

  @Get('test-attempts/:id/result')
  async previewResult(@Param('id') id: string) {
    const user = await this.tests.previewUser();
    return this.engine.result(id, user.id);
  }
}
