import { Body, Controller, Get, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AppException } from '../../common/errors';
import { lessonTopicTitle } from '../../common/topic-title';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { SubscriberPayload } from '../auth/jwt.strategy';
import { loadPublishedLessonQuiz, quizPayload } from '../catalog/lesson-quiz';
import { GradePublicTestDto } from '../catalog/public-test.dto';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { SETTING_KEYS, SettingsService } from '../settings/settings.service';
import { gradeAttempt } from '../testing/grading';
import { LessonAccessService } from './lesson-access.service';
import { MediaSessionService } from './session.service';
import { PrismaService } from '../../prisma/prisma.service';
import { VideoProgressDto } from './video-progress.dto';

@ApiTags('media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SubscriberMediaController {
  constructor(
    private readonly access: LessonAccessService,
    private readonly sessions: MediaSessionService,
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly settings: SettingsService,
  ) {}

  @Get('courses/:courseId/lessons')
  async courseLessons(
    @Param('courseId') courseId: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, status: 'published' },
      include: {
        translations: true,
        sections: {
          where: { status: 'published' },
          orderBy: { sortOrder: 'asc' },
          include: {
            translations: true,
            lessons: {
              where: { status: 'published' },
              orderBy: { sortOrder: 'asc' },
              include: {
                translations: true,
                tests: { where: { isActive: true }, select: { id: true, title: true, questionCount: true, mode: true } },
                videos: {
                  select: { originalName: true, updatedAt: true },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
        tests: { where: { isActive: true, lessonId: null }, select: { id: true, title: true, questionCount: true, mode: true } },
      },
    });
    if (!course) throw new AppException('COURSE_NOT_FOUND', 'Course not found');
    let entitled = false;
    try {
      await this.entitlements.assertActive(req.user.userId, courseId);
      entitled = true;
    } catch {
      entitled = false;
    }
    return {
      id: course.id,
      slug: course.slug,
      translations: course.translations,
      entitled,
      tests: course.tests,
      sections: course.sections.map((section) => ({
        id: section.id,
        translations: section.translations,
        lessons: section.lessons.map((lesson) => ({
          id: lesson.id,
          isFreePreview: lesson.isFreePreview,
          accessible: entitled || lesson.isFreePreview,
          translations: lesson.translations,
          topicTitle: lessonTopicTitle(lesson.translations, lesson.videos[0]?.originalName, {
            lessonUpdatedAt: lesson.updatedAt,
            videoUpdatedAt: lesson.videos[0]?.updatedAt,
          }),
          tests: lesson.tests,
        })),
      })),
    };
  }

  @Get('lessons/:lessonId')
  async lesson(
    @Param('lessonId') lessonId: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    await this.access.assertCanViewLesson(req.user.userId, lessonId);
    const lesson = await this.prisma.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      include: {
        translations: true,
        videos: { include: { variants: true } },
        documents: { include: { document: true } },
        tests: { where: { isActive: true } },
        situationalTasks: true,
        clinicalCases: { include: { _count: { select: { steps: true, media: true } } } },
      },
    });
    return {
      id: lesson.id,
      status: lesson.status,
      isFreePreview: lesson.isFreePreview,
      translations: lesson.translations,
      videos: lesson.videos.map((video) => ({
        id: video.id,
        status: video.status,
        durationSec: video.durationSec,
        accessType: video.accessType,
        hasPreview: Boolean(video.previewSourceKey),
        variants: video.variants.map((variant) => ({
          quality: variant.quality,
          protocol: variant.protocol,
        })),
      })),
      documents: lesson.documents.map((item) => ({
        id: item.document.id,
        title: item.document.title,
        kind: item.document.kind,
        accessType: item.document.accessType,
        previewPages: item.document.previewPagesCount ?? 0,
      })),
      tests: lesson.tests.map((test) => ({
        id: test.id,
        title: test.title,
        questionCount: test.questionCount,
        mode: test.mode,
        accessType: test.accessType,
        demoQuestionCount: test.demoQuestionCount,
      })),
      simpleCases: lesson.situationalTasks.map((task) => ({
        id: task.id,
        kind: task.kind,
        title: (task.payload as { title?: string }).title ?? task.kind,
      })),
      clinicalCases: lesson.clinicalCases.map((item) => ({
        id: item.id,
        title: item.title,
        steps: item._count.steps,
      })),
    };
  }

  @Post('lessons/:lessonId/playback-session')
  async lessonPlayback(
    @Param('lessonId') lessonId: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    await this.access.assertCanViewLesson(req.user.userId, lessonId);
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId },
      include: { videos: { orderBy: { createdAt: 'desc' } } },
    });
    const video = lesson?.videos.find((item) => item.sourceKey || item.previewSourceKey) ?? lesson?.videos[0];
    if (!video) throw new AppException('VIDEO_NOT_FOUND', 'Lesson video is not attached', HttpStatus.NOT_FOUND);
    return this.sessions.playback(video.id, req.user.userId, req.user.deviceRecordId);
  }

  @Post('lessons/:lessonId/notes-session')
  async lessonNotes(
    @Param('lessonId') lessonId: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    await this.access.assertCanViewLesson(req.user.userId, lessonId);
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId },
      include: { documents: { orderBy: { documentId: 'asc' } } },
    });
    const documentId = lesson?.documents[0]?.documentId;
    if (!documentId) throw new AppException('PDF_NOT_FOUND', 'PDF notes are not attached', HttpStatus.NOT_FOUND);
    return this.sessions.viewPdf(documentId, req.user.userId);
  }

  @Get('lessons/:lessonId/test')
  async lessonTest(
    @Param('lessonId') lessonId: string,
    @Query('lang') lang: string | undefined,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    await this.access.assertCanViewLesson(req.user.userId, lessonId);
    const { test, language } = await loadPublishedLessonQuiz(this.prisma, lessonId, lang);
    return quizPayload(test, language).payload;
  }

  @Post('lessons/:lessonId/test/grade')
  async gradeLessonTest(
    @Param('lessonId') lessonId: string,
    @Body() body: GradePublicTestDto,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    await this.access.assertCanViewLesson(req.user.userId, lessonId);
    const { test, language } = await loadPublishedLessonQuiz(this.prisma, lessonId);
    const { questions } = quizPayload(test, language);
    const answers = new Map(body.answers.map((item) => [item.questionId, item.selectedCode]));
    let correctCount = 0;
    for (const question of questions) {
      const selected = answers.get(question.id);
      const correct = question.options.find((option) => option.isCorrect)?.code;
      if (selected && correct && selected === correct) correctCount += 1;
    }
    return gradeAttempt(correctCount, questions.length);
  }

  @Get('videos/:videoId/progress')
  async videoProgress(
    @Param('videoId') videoId: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    await this.access.assertCanPlayVideo(req.user.userId, videoId, true);
    const row = await this.prisma.videoProgress.findUnique({
      where: { userId_videoId: { userId: req.user.userId, videoId } },
    });
    return {
      positionSeconds: row?.positionSeconds ?? 0,
      durationSeconds: row?.durationSeconds ?? 0,
      completed: row?.completed ?? false,
    };
  }

  @Post('lessons/:lessonId/complete')
  async completeLesson(
    @Param('lessonId') lessonId: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    await this.access.assertCanViewLesson(req.user.userId, lessonId);
    return this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: req.user.userId, lessonId } },
      create: { userId: req.user.userId, lessonId, completed: true },
      update: { completed: true },
    });
  }

  @Get('lessons/:lessonId/progress')
  async lessonProgress(
    @Param('lessonId') lessonId: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    const row = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: req.user.userId, lessonId } },
    });
    return { completed: row?.completed ?? false };
  }

  @Post('videos/:videoId/playback-session')
  async playback(
    @Param('videoId') videoId: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    await this.access.assertCanPlayVideo(req.user.userId, videoId);
    return this.sessions.playback(videoId, req.user.userId, req.user.deviceRecordId);
  }

  @Post('videos/:videoId/progress')
  progress(
    @Param('videoId') videoId: string,
    @Body() body: VideoProgressDto,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    return this.recordProgress(req.user.userId, videoId, body);
  }

  @Post('videos/:videoId/heartbeat')
  heartbeat(
    @Param('videoId') videoId: string,
    @Body() body: VideoProgressDto,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    return this.recordProgress(req.user.userId, videoId, body);
  }

  @Post('documents/:documentId/view-session')
  async viewPdf(
    @Param('documentId') documentId: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    await this.access.assertCanViewDocument(req.user.userId, documentId);
    return this.sessions.viewPdf(documentId, req.user.userId);
  }

  private async recordProgress(userId: string, videoId: string, body: VideoProgressDto) {
    await this.access.assertCanPlayVideo(userId, videoId);
    const threshold = Number(await this.settings.get(SETTING_KEYS.videoCompletedPercent, 90));
    const completed = body.watchPercent >= threshold;
    return this.prisma.videoProgress.upsert({
      where: { userId_videoId: { userId, videoId } },
      create: {
        userId,
        videoId,
        watchSeconds: body.watchSeconds,
        watchPercent: body.watchPercent,
        durationSeconds: body.durationSeconds ?? 0,
        positionSeconds: body.positionSeconds ?? body.watchSeconds,
        completed,
      },
      update: {
        watchSeconds: body.watchSeconds,
        watchPercent: body.watchPercent,
        durationSeconds: body.durationSeconds ?? undefined,
        positionSeconds: body.positionSeconds ?? body.watchSeconds,
        completed,
        lastSeenAt: new Date(),
      },
      select: {
        watchSeconds: true,
        watchPercent: true,
        positionSeconds: true,
        completed: true,
        lastSeenAt: true,
      },
    });
  }
}
