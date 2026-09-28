import { Body, Controller, Get, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppException, Errors } from '../../common/errors';
import { lessonTopicTitle } from '../../common/topic-title';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaSessionService } from '../media/session.service';
import { SETTING_KEYS, SettingsService } from '../settings/settings.service';
import { publicPaymentMethods } from '../payments/wallets';
import { gradeAttempt } from '../testing/grading';
import { displayAmount, isPremiumPrices, publicTelegramContactUrl, resolveCommerceChannel } from './commerce';
import { loadPublishedLessonQuiz, quizPayload } from './lesson-quiz';
import { isFreeAccess } from '../media/access-policy';
import { buildOffer, storeSku, year3BundleFromOffer } from './offer';
import { GradePublicTestDto } from './public-test.dto';

@ApiTags('public')
@Controller('public')
export class CatalogController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: MediaSessionService,
    private readonly settings: SettingsService,
  ) {}

  @Get('commerce')
  async commerce() {
    const [channel, telegramUrl] = await Promise.all([
      this.settings.get<string>(SETTING_KEYS.commerceChannel, process.env.COMMERCE_CHANNEL ?? 'manual_telegram'),
      this.settings.get<string>(
        SETTING_KEYS.telegramContactUrl,
        process.env.TELEGRAM_CONTACT_URL ?? process.env.NEXT_PUBLIC_TELEGRAM_CONTACT_URL ?? '',
      ),
    ]);
    return {
      channel: resolveCommerceChannel(channel),
      grantsAccess: false,
      checkoutPath: '/login',
      telegramUrl: publicTelegramContactUrl(String(telegramUrl || '')),
    };
  }

  @Get('disciplines')
  disciplines() {
    return this.prisma.discipline.findMany({
      where: { status: 'published' },
      include: { translations: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Get('courses')
  async courses() {
    const rows = await this.prisma.course.findMany({
      where: { status: 'published' },
      include: {
        translations: true,
        discipline: { include: { translations: true } },
        prices: { include: { plan: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((course) => this.withPremium(course));
  }

  @Get('courses/:slug')
  async course(@Param('slug') slug: string) {
    const course = await this.prisma.course.findFirstOrThrow({
      where: { slug, status: 'published' },
      include: {
        translations: true,
        discipline: { include: { translations: true } },
        prices: { include: { plan: true } },
        sections: {
          where: { status: { not: 'archived' } },
          orderBy: { sortOrder: 'asc' },
          include: {
            translations: true,
            lessons: {
              where: { status: { not: 'archived' } },
              orderBy: { sortOrder: 'asc' },
              include: {
                translations: true,
                tests: { where: { isActive: true }, select: { id: true, title: true } },
                videos: {
                  select: { originalName: true, updatedAt: true },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    return this.withPremium({
      ...course,
      sections: course.sections.map((section) => ({
        ...section,
        lessons: section.lessons.map((lesson) => {
          const video = lesson.videos[0];
          const { videos: _videos, ...rest } = lesson;
          return {
            ...rest,
            premium: !lesson.isFreePreview,
            topicTitle: lessonTopicTitle(lesson.translations, video?.originalName, {
              lessonUpdatedAt: lesson.updatedAt,
              videoUpdatedAt: video?.updatedAt,
            }),
          };
        }),
      })),
    });
  }

  @Get('lessons/:id')
  async publicLesson(@Param('id') id: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, status: { not: 'archived' }, section: { status: { not: 'archived' }, course: { status: 'published' } } },
      include: {
        translations: true,
        tests: { where: { isActive: true }, select: { id: true, title: true, accessType: true, demoQuestionCount: true } },
        documents: { include: { document: { select: { id: true, title: true, kind: true, accessType: true, previewPagesCount: true } } } },
        videos: {
          select: {
            id: true,
            status: true,
            sourceKey: true,
            previewSourceKey: true,
            originalName: true,
            updatedAt: true,
            accessType: true,
            durationSec: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        section: {
          include: {
            course: {
              select: {
                id: true,
                slug: true,
                prices: { include: { plan: true } },
                sections: {
                  where: { status: { not: 'archived' } },
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    lessons: {
                      where: { status: { not: 'archived' } },
                      orderBy: { sortOrder: 'asc' },
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!lesson) throw new AppException('LESSON_NOT_FOUND', 'Lesson not found');
    const playable = lesson.videos.find((video) => video.sourceKey || video.previewSourceKey || video.status === 'READY' || video.status === 'PROCESSING')
      ?? lesson.videos[0];
    const coursePremium = isPremiumPrices(lesson.section.course.prices);
    const ids = lesson.section.course.sections.flatMap((section) => section.lessons.map((item) => item.id));
    const index = ids.indexOf(lesson.id);
    const videoFree = playable ? isFreeAccess(playable.accessType, lesson.isFreePreview) : false;
    const docs = lesson.documents.map((row) => ({
      id: row.document.id,
      title: row.document.title,
      kind: row.document.kind,
      accessType: row.document.accessType,
      previewPages: row.document.previewPagesCount ?? 0,
      locked: !isFreeAccess(row.document.accessType, lesson.isFreePreview) && !(row.document.previewPagesCount ?? 0),
    }));
    return {
      id: lesson.id,
      isFreePreview: lesson.isFreePreview,
      premium: !lesson.isFreePreview && coursePremium,
      translations: lesson.translations,
      tests: lesson.tests.map((test) => ({
        id: test.id,
        title: test.title,
        accessType: test.accessType,
        demo: test.demoQuestionCount > 0,
        locked: !isFreeAccess(test.accessType, lesson.isFreePreview) && test.demoQuestionCount <= 0,
      })),
      documents: docs.map(({ id: docId, title, kind }) => ({ id: docId, title, kind })),
      course: {
        id: lesson.section.course.id,
        slug: lesson.section.course.slug,
        premium: coursePremium,
        prices: this.publicPrices(lesson.section.course.prices),
      },
      hasPdf: docs.some((item) => item.kind === 'pdf'),
      hasPresentation: docs.some((item) => item.kind === 'presentation'),
      hasVideo: Boolean(playable),
      hasPreview: Boolean(playable?.previewSourceKey || lesson.tests.some((test) => test.demoQuestionCount > 0)),
      videoLocked: Boolean(playable) && !videoFree && !playable?.previewSourceKey,
      videoId: videoFree || playable?.previewSourceKey ? playable?.id ?? null : null,
      prevLessonId: index > 0 ? ids[index - 1] : null,
      nextLessonId: index >= 0 && index < ids.length - 1 ? ids[index + 1] : null,
      topicTitle: lessonTopicTitle(lesson.translations, playable?.originalName, {
        lessonUpdatedAt: lesson.updatedAt,
        videoUpdatedAt: playable?.updatedAt,
      }),
      demoVideoUrl: '',
      demoPdfUrl: '',
    };
  }

  @Post('lessons/:id/playback-session')
  async publicPlaybackSession(@Param('id') id: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, status: { not: 'archived' }, section: { status: { not: 'archived' }, course: { status: 'published' } } },
      include: { videos: { orderBy: { createdAt: 'desc' } } },
    });
    if (!lesson) throw new AppException('LESSON_NOT_FOUND', 'Lesson not found', HttpStatus.NOT_FOUND);
    const video = lesson.videos.find((item) => item.sourceKey || item.previewSourceKey) ?? lesson.videos[0];
    if (!video) throw new AppException('VIDEO_NOT_FOUND', 'Lesson video is not attached', HttpStatus.NOT_FOUND);
    if (isFreeAccess(video.accessType, lesson.isFreePreview) || video.sourceKey) {
      return this.sessions.playback(video.id, 'public-lesson');
    }
    if (video.previewSourceKey) {
      return this.sessions.playback(video.id, 'public-preview', undefined, true);
    }
    throw Errors.entitlementInactive();
  }

  @Post('lessons/:id/notes-session')
  async publicNotesSession(@Param('id') id: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, status: { not: 'archived' }, section: { status: { not: 'archived' }, course: { status: 'published' } } },
      include: { documents: { include: { document: true }, orderBy: { documentId: 'asc' } } },
    });
    if (!lesson) throw new AppException('LESSON_NOT_FOUND', 'Lesson not found', HttpStatus.NOT_FOUND);
    const document = lesson.documents[0]?.document;
    if (!document) throw new AppException('PDF_NOT_FOUND', 'PDF notes are not attached', HttpStatus.NOT_FOUND);
    return this.sessions.viewPdf(document.id, 'public-notes');
  }

  @Get('lessons/:id/test')
  async publicLessonTest(@Param('id') id: string, @Query('lang') lang?: string) {
    const loaded = await this.loadPublicLessonTest(id, lang);
    return quizPayload(loaded.test, loaded.language, loaded.maxQuestions).payload;
  }

  @Post('lessons/:id/test/grade')
  async gradePublicLessonTest(
    @Param('id') id: string,
    @Body() body: GradePublicTestDto,
  ) {
    const loaded = await this.loadPublicLessonTest(id);
    const { questions } = quizPayload(loaded.test, loaded.language, loaded.maxQuestions);
    const answers = new Map(body.answers.map((item) => [item.questionId, item.selectedCode]));
    let correctCount = 0;
    for (const question of questions) {
      const selected = answers.get(question.id);
      const correct = question.options.find((option) => option.isCorrect)?.code;
      if (selected && correct && selected === correct) correctCount += 1;
    }
    return gradeAttempt(correctCount, questions.length);
  }

  @Get('account-deletion')
  accountDeletion() {
    return {
      inApp: true,
      webPath: '/account-deletion',
      removes: ['phone', 'pin', 'devices', 'push tokens', 'display name'],
      retains: ['anonymized payment facts'],
    };
  }

  @Get('offer')
  async offer() {
    const [courses, plans] = await Promise.all([
      this.prisma.course.findMany({
        where: { status: 'published' },
        include: {
          translations: true,
          prices: { include: { plan: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.plan.findMany({ orderBy: { durationDays: 'asc' } }),
    ]);
    const offer = buildOffer({ courses, plans });
    return { ...offer, year3Bundle: year3BundleFromOffer(offer.courses) };
  }

  @Get('payment-methods')
  paymentMethods() {
    return publicPaymentMethods();
  }

  @Get('store-products')
  async storeProducts() {
    const plans = await this.prisma.plan.findMany({ orderBy: { durationDays: 'asc' } });
    return {
      grantsAccess: false,
      sources: ['GOOGLE_PLAY', 'APPLE_IAP'],
      plans: plans.map((plan) => ({
        planCode: plan.code,
        durationDays: plan.durationDays,
        ...storeSku(plan.code),
      })),
    };
  }

  @Get('courses/:id/preview')
  preview(@Param('id') id: string) {
    return this.prisma.lesson.findMany({
      where: {
        isFreePreview: true,
        status: 'published',
        section: { courseId: id, status: 'published' },
      },
      include: { translations: true, section: true },
    });
  }

  private async loadPublicLessonTest(lessonId: string, lang?: string) {
    const loaded = await loadPublishedLessonQuiz(this.prisma, lessonId, lang);
    if (isFreeAccess(loaded.test.accessType, loaded.lesson.isFreePreview)) return { ...loaded, maxQuestions: loaded.test.questionCount };
    if (loaded.test.demoQuestionCount > 0) return { ...loaded, maxQuestions: loaded.test.demoQuestionCount };
    throw Errors.entitlementInactive();
  }

  private withPremium<T extends { prices: { amountMinor: number; currency: string; plan: { code: string; durationDays: number } }[] }>(
    course: T,
  ) {
    return {
      ...course,
      premium: isPremiumPrices(course.prices),
      prices: this.publicPrices(course.prices),
    };
  }

  private publicPrices(prices: { amountMinor: number; currency: string; plan: { code: string; durationDays: number } }[]) {
    return [...prices]
      .sort((a, b) => a.plan.durationDays - b.plan.durationDays)
      .map((price) => ({
        planCode: price.plan.code,
        durationDays: price.plan.durationDays,
        amountMinor: price.amountMinor,
        amount: displayAmount(price.amountMinor),
        currency: price.currency,
      }));
  }
}
