import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Readable } from 'node:stream';
import { AppException } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../admin-cms/audit.service';
import { LessonAccessService } from '../media/lesson-access.service';
import { MediaSessionService } from '../media/session.service';
import { StorageService } from '../media/storage.service';
import {
  AnswerSimpleCaseDto,
  CreateClinicalCaseDto,
  CreateSimpleCaseDto,
  UpdateClinicalCaseDto,
} from './clinical.dto';

type SimplePayload = {
  title: string;
  vignette: string;
  questions: {
    prompt: string;
    options: { id: string; text: string }[];
    correct: string | string[];
    explanation?: string;
  }[];
};

@Injectable()
export class ClinicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: LessonAccessService,
    private readonly storage: StorageService,
    private readonly sessions: MediaSessionService,
  ) {}

  listLessons() {
    return this.prisma.lesson.findMany({
      include: {
        translations: true,
        section: { include: { course: { include: { translations: true } } } },
      },
      orderBy: { sortOrder: 'asc' },
    }).then((lessons) =>
      lessons.map((lesson) => ({
        id: lesson.id,
        title: [
          lesson.section.course.translations[0]?.title,
          lesson.translations[0]?.title,
        ]
          .filter(Boolean)
          .join(' — '),
      })),
    );
  }

  async list() {
    const [tasks, cases] = await Promise.all([
      this.prisma.situationalTask.findMany({
        include: { lesson: { include: { translations: true, section: { include: { course: { include: { translations: true } } } } } } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.clinicalCase.findMany({
        include: {
          lesson: { include: { translations: true, section: { include: { course: { include: { translations: true } } } } } },
          _count: { select: { steps: true, media: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return [
      ...tasks.map((item) => ({
        type: 'simple' as const,
        id: item.id,
        title: (item.payload as SimplePayload).title ?? item.kind,
        lessonId: item.lessonId,
        lesson: item.lesson,
        kind: item.kind,
      })),
      ...cases.map((item) => ({
        type: 'interactive' as const,
        id: item.id,
        title: item.title,
        lessonId: item.lessonId,
        lesson: item.lesson,
        steps: item._count.steps,
        media: item._count.media,
      })),
    ];
  }

  async createSimple(adminId: string, dto: CreateSimpleCaseDto, ip?: string) {
    validateSimplePayload(dto);
    const task = await this.prisma.situationalTask.create({
      data: {
        lessonId: dto.lessonId,
        kind: 'simple',
        payload: {
          title: dto.title,
          vignette: dto.vignette,
          questions: dto.questions,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({ adminId, action: 'create', entity: 'situational_task', entityId: task.id, ip });
    return this.publicSimple(task, true);
  }

  async getSimple(id: string, reveal: boolean) {
    const task = await this.prisma.situationalTask.findUniqueOrThrow({ where: { id } });
    return this.publicSimple(task, reveal);
  }

  async answerSimple(id: string, body: AnswerSimpleCaseDto) {
    const task = await this.prisma.situationalTask.findUniqueOrThrow({ where: { id } });
    const payload = task.payload as SimplePayload;
    const items = payload.questions.map((question, index) => {
      const selected = body.selected[index] ?? [];
      const correct = Array.isArray(question.correct) ? question.correct : [question.correct];
      const ok =
        selected.length === correct.length &&
        [...selected].sort().join('|') === [...correct].sort().join('|');
      return {
        index,
        correct: ok,
        selected,
        correctCodes: correct,
        explanation: question.explanation ?? null,
      };
    });
    return {
      correctCount: items.filter((item) => item.correct).length,
      questionCount: items.length,
      items,
    };
  }

  async createCase(adminId: string, dto: CreateClinicalCaseDto, ip?: string) {
    const created = await this.prisma.clinicalCase.create({
      data: {
        lessonId: dto.lessonId,
        title: dto.title,
        patientAge: dto.patientAge,
        patientSex: dto.patientSex,
        complaints: dto.complaints,
        history: dto.history,
        examination: dto.examination,
        laboratory: dto.laboratory,
        instrumental: dto.instrumental,
        diagnosis: dto.diagnosis,
        differential: dto.differential,
        discussion: dto.discussion,
        conclusion: dto.conclusion,
        status: dto.status ?? 'draft',
        category: dto.category,
        specialty: dto.specialty,
        management: dto.management,
        references: dto.references as object | undefined,
        reviewerName: dto.reviewerName,
        lastReviewedAt: dto.reviewerName ? new Date() : undefined,
        publishedAt: dto.status === 'published' ? new Date() : undefined,
        createdBy: adminId,
        updatedBy: adminId,
        steps: dto.steps?.length
          ? {
              create: dto.steps.map((step, index) => ({
                title: step.title,
                body: step.body,
                sortOrder: step.sortOrder ?? index,
              })),
            }
          : undefined,
      },
    });
    await this.audit.log({ adminId, action: 'create', entity: 'clinical_case', entityId: created.id, ip });
    return this.getCase(created.id, true);
  }

  async updateCase(adminId: string, id: string, dto: UpdateClinicalCaseDto, ip?: string) {
    await this.prisma.clinicalCase.update({
      where: { id },
      data: {
        title: dto.title,
        patientAge: dto.patientAge,
        patientSex: dto.patientSex,
        complaints: dto.complaints,
        history: dto.history,
        examination: dto.examination,
        laboratory: dto.laboratory,
        instrumental: dto.instrumental,
        diagnosis: dto.diagnosis,
        differential: dto.differential,
        discussion: dto.discussion,
        conclusion: dto.conclusion,
        status: dto.status,
        category: dto.category,
        specialty: dto.specialty,
        management: dto.management,
        references: dto.references as object | undefined,
        reviewerName: dto.reviewerName,
        lastReviewedAt: dto.reviewerName ? new Date() : undefined,
        publishedAt: dto.status === 'published' ? new Date() : undefined,
        updatedBy: adminId,
      },
    });
    if (dto.steps) {
      await this.prisma.clinicalCaseStep.deleteMany({ where: { clinicalCaseId: id } });
      if (dto.steps.length > 0) {
        await this.prisma.clinicalCaseStep.createMany({
          data: dto.steps.map((step, index) => ({
            clinicalCaseId: id,
            title: step.title,
            body: step.body,
            sortOrder: step.sortOrder ?? index,
          })),
        });
      }
    }
    await this.audit.log({ adminId, action: 'update', entity: 'clinical_case', entityId: id, ip });
    return this.getCase(id, true);
  }

  async getCase(id: string, reveal: boolean) {
    const item = await this.prisma.clinicalCase.findUniqueOrThrow({
      where: { id },
      include: {
        steps: { orderBy: { sortOrder: 'asc' } },
        media: true,
        lesson: { include: { translations: true } },
      },
    });
    return {
      id: item.id,
      lessonId: item.lessonId,
      title: item.title,
      patientAge: item.patientAge,
      patientSex: item.patientSex,
      complaints: item.complaints,
      history: item.history,
      examination: item.examination,
      laboratory: item.laboratory,
      instrumental: item.instrumental,
      steps: item.steps.map((step) => ({
        id: step.id,
        sortOrder: step.sortOrder,
        title: step.title,
        body: step.body,
      })),
      media: item.media.map((row) => ({
        id: row.id,
        kind: row.kind,
        caption: row.caption,
      })),
      ...(reveal
        ? {
            diagnosis: item.diagnosis,
            differential: item.differential,
            discussion: item.discussion,
            conclusion: item.conclusion,
            management: item.management,
            references: item.references,
          }
        : {}),
      status: item.status,
      category: item.category,
      specialty: item.specialty,
      lastReviewedAt: item.lastReviewedAt,
      reviewerName: item.reviewerName,
    };
  }

  async attachImage(
    adminId: string,
    caseId: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    caption?: string,
    ip?: string,
  ) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new AppException('IMAGE_REQUIRED', 'Only JPEG, PNG or WebP images are accepted');
    }
    await this.prisma.clinicalCase.findUniqueOrThrow({ where: { id: caseId } });
    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const media = await this.prisma.clinicalCaseMedia.create({
      data: {
        clinicalCaseId: caseId,
        storageKey: 'pending',
        kind: 'image',
        caption: caption || file.originalname,
      },
    });
    const storageKey = this.storage.clinicalImageKey(caseId, media.id, ext);
    await this.storage.writeStream(storageKey, Readable.from(file.buffer));
    const saved = await this.prisma.clinicalCaseMedia.update({
      where: { id: media.id },
      data: { storageKey },
    });
    await this.audit.log({ adminId, action: 'create', entity: 'clinical_media', entityId: saved.id, ip });
    return { id: saved.id, kind: saved.kind, caption: saved.caption };
  }

  async viewImage(mediaId: string, subject: string, userId?: string, isAdmin = false) {
    const media = await this.prisma.clinicalCaseMedia.findUniqueOrThrow({
      where: { id: mediaId },
      include: { clinicalCase: true },
    });
    if (!isAdmin && userId) {
      await this.access.assertCanViewLesson(userId, media.clinicalCase.lessonId);
    }
    return this.sessions.viewClinicalImage(media.id, subject);
  }

  async assertCanViewTask(userId: string, taskId: string) {
    const task = await this.prisma.situationalTask.findUniqueOrThrow({ where: { id: taskId } });
    await this.access.assertCanViewLesson(userId, task.lessonId);
    return task;
  }

  async assertCanViewCase(userId: string, caseId: string) {
    const item = await this.prisma.clinicalCase.findUniqueOrThrow({ where: { id: caseId } });
    if (item.status !== 'published') {
      throw new AppException('CASE_UNPUBLISHED', 'Clinical case is not published', HttpStatus.NOT_FOUND);
    }
    await this.access.assertCanViewLesson(userId, item.lessonId);
    return item;
  }

  forLesson(lessonId: string) {
    return Promise.all([
      this.prisma.situationalTask.findMany({ where: { lessonId } }),
      this.prisma.clinicalCase.findMany({
        where: { lessonId, status: 'published' },
        include: { _count: { select: { steps: true, media: true } } },
      }),
    ]).then(([tasks, cases]) => ({
      simpleCases: tasks.map((task) => this.publicSimple(task, false)),
      clinicalCases: cases.map((item) => ({
        id: item.id,
        title: item.title,
        steps: item._count.steps,
        media: item._count.media,
      })),
    }));
  }

  private publicSimple(
    task: { id: string; lessonId: string; kind: string; payload: Prisma.JsonValue },
    reveal: boolean,
  ) {
    const payload = task.payload as SimplePayload;
    return {
      id: task.id,
      lessonId: task.lessonId,
      kind: task.kind,
      title: payload.title,
      vignette: payload.vignette,
      questions: payload.questions.map((question) => ({
        prompt: question.prompt,
        options: question.options,
        ...(reveal
          ? { correct: question.correct, explanation: question.explanation ?? null }
          : {}),
      })),
    };
  }
}

function validateSimplePayload(dto: CreateSimpleCaseDto) {
  dto.questions.forEach((question, index) => {
    const ids = question.options.map((option) => option.id);
    const answers = Array.isArray(question.correct) ? question.correct : [question.correct];
    for (const answer of answers) {
      if (!ids.includes(answer)) {
        throw new AppException('CASE_INVALID', `Question ${index + 1}: correct_answer does not exist`);
      }
    }
  });
}
