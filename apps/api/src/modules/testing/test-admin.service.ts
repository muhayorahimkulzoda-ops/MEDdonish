import { Injectable } from '@nestjs/common';
import { Language, TestMode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../admin-cms/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SETTING_KEYS, SettingsService } from '../settings/settings.service';
import { QuestionImportService, type ImportedQuestion } from './question-import.service';

@Injectable()
export class TestAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
    private readonly questions: QuestionImportService,
  ) {}

  listQuestions(filters: { courseId?: string; lessonId?: string; disciplineId?: string }) {
    return this.prisma.question.findMany({
      where: {
        courseId: filters.courseId,
        lessonId: filters.lessonId,
        disciplineId: filters.disciplineId,
        isActive: true,
      },
      include: {
        translations: true,
        options: { include: { translations: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
      take: filters.lessonId ? 2000 : 200,
    });
  }

  listTests() {
    return this.prisma.test.findMany({
      include: {
        _count: { select: { pool: true, attempts: true } },
        lesson: { include: { translations: true } },
        course: { include: { translations: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  getTest(id: string) {
    return this.prisma.test.findUniqueOrThrow({
      where: { id },
      include: {
        pool: { include: { question: { include: { translations: true } } } },
        _count: { select: { attempts: true } },
      },
    });
  }

  async create(
    adminId: string,
    data: {
      title: string;
      lessonId?: string;
      courseId?: string;
      disciplineId?: string;
      questionCount?: number;
      timePerQuestion?: number;
      mode?: TestMode;
      questionIds?: string[];
    },
    ip?: string,
  ) {
    const test = await this.prisma.test.create({
      data: {
        title: data.title,
        lessonId: data.lessonId,
        courseId: data.courseId,
        disciplineId: data.disciplineId,
        questionCount:
          data.questionCount ?? Number(await this.settings.get(SETTING_KEYS.defaultQuestionCount, 30)),
        timePerQuestion:
          data.timePerQuestion ?? Number(await this.settings.get(SETTING_KEYS.secondsPerQuestion, 20)),
        mode: data.mode ?? TestMode.TRAINING,
      },
    });

    const ids = data.questionIds?.length
      ? data.questionIds
      : (
          await this.prisma.question.findMany({
            where: {
              isActive: true,
              ...(data.lessonId
                ? { lessonId: data.lessonId }
                : data.courseId
                  ? { courseId: data.courseId }
                  : data.disciplineId
                    ? { disciplineId: data.disciplineId }
                    : {}),
            },
            select: { id: true },
          })
        ).map((row) => row.id);

    if (ids.length > 0) {
      await this.prisma.testQuestionPool.createMany({
        data: ids.map((questionId) => ({ testId: test.id, questionId })),
        skipDuplicates: true,
      });
    }

    await this.audit.log({
      adminId,
      action: 'create',
      entity: 'test',
      entityId: test.id,
      ip,
    });
    if (test.isActive) {
      await this.notifications.announce('new_test', {
        title: test.title,
        extra: test.id,
        courseId: test.courseId ?? undefined,
      });
    }
    return this.getTest(test.id);
  }

  async attachLessonJsonTest(
    adminId: string,
    lessonId: string,
    questions: ImportedQuestion[],
    title: string | undefined,
    ip?: string,
  ) {
    const lesson = await this.prisma.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      include: {
        translations: true,
        section: { include: { course: true } },
      },
    });
    const ids = await this.questions.importNow(questions, {
      language: Language.ru,
      lessonId,
      courseId: lesson.section.courseId,
      sectionId: lesson.sectionId,
      disciplineId: lesson.section.course.disciplineId,
    });
    const lessonTitle = lesson.translations.find((row) => row.language === Language.ru)?.title ?? lessonId;
    return this.create(
      adminId,
      {
        title: title?.trim() || `Тест: ${lessonTitle}`,
        lessonId,
        courseId: lesson.section.courseId,
        disciplineId: lesson.section.course.disciplineId,
        questionCount: Math.max(1, Math.min(ids.length, 30)),
        questionIds: ids,
        mode: TestMode.TRAINING,
      },
      ip,
    );
  }

  async replaceLessonJsonTest(
    adminId: string,
    lessonId: string,
    questions: ImportedQuestion[],
    title: string | undefined,
    ip?: string,
  ) {
    await this.prisma.question.updateMany({
      where: { lessonId },
      data: { isActive: false },
    });
    if (questions.length === 0) {
      await this.audit.log({
        adminId,
        action: 'delete',
        entity: 'question_bank',
        entityId: lessonId,
        ip,
      });
      return { ok: true, count: 0 };
    }
    return this.attachLessonJsonTest(adminId, lessonId, questions, title, ip);
  }

  async previewUser() {
    return this.prisma.user.upsert({
      where: { phone: '+19900000000' },
      update: {},
      create: {
        phone: '+19900000000',
        phoneVerified: true,
        profile: { create: { displayName: 'Admin preview' } },
      },
    });
  }
}
