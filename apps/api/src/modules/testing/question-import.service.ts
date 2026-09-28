import { Injectable } from '@nestjs/common';
import { Language, Prisma, QuestionType } from '@prisma/client';
import { AppException } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';
import { TYPE_MAP } from './grading';

export interface ImportedQuestion {
  type: keyof typeof TYPE_MAP;
  question: string;
  image?: string | null;
  options: { id: string; text: string }[];
  correct_answer: string | string[];
  explanation?: string;
}

export interface ImportMeta {
  language?: Language;
  disciplineId?: string;
  courseId?: string;
  sectionId?: string;
  lessonId?: string;
}

@Injectable()
export class QuestionImportService {
  constructor(private readonly prisma: PrismaService) {}

  preview(questions: ImportedQuestion[]) {
    const errors = validateQuestions(questions);
    return {
      total: questions.length,
      valid: questions.length - errors.length,
      errors,
      preview: questions.slice(0, 5).map((item, index) => ({
        index: index + 1,
        type: item.type,
        question: item.question,
        options: item.options.length,
      })),
    };
  }

  async importNow(questions: unknown[], meta: ImportMeta) {
    const normalized = normalizeImportedQuestions(questions);
    const errors = validateQuestions(normalized);
    if (errors.length > 0) {
      throw new AppException('IMPORT_INVALID', errors[0]);
    }
    const language = meta.language ?? Language.ru;
    const ids: string[] = [];
    for (const item of normalized) {
      const created = await this.createQuestion(item, meta, language);
      ids.push(created.id);
    }
    return ids;
  }

  async confirm(questions: ImportedQuestion[], meta: ImportMeta) {
    const errors = validateQuestions(questions);
    if (errors.length > 0) {
      throw new AppException('IMPORT_INVALID', errors[0]);
    }
    const job = await this.prisma.questionImportJob.create({
      data: {
        status: 'pending',
        total: questions.length,
        payload: { questions, meta } as unknown as Prisma.InputJsonValue,
      },
    });
    setImmediate(() => {
      void this.process(job.id);
    });
    return { jobId: job.id, status: job.status, total: job.total };
  }

  getJob(id: string) {
    return this.prisma.questionImportJob.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        status: true,
        total: true,
        imported: true,
        errors: true,
        createdAt: true,
        finishedAt: true,
      },
    });
  }

  async process(jobId: string) {
    const job = await this.prisma.questionImportJob.findUniqueOrThrow({ where: { id: jobId } });
    const { questions, meta } = job.payload as unknown as {
      questions: ImportedQuestion[];
      meta: ImportMeta;
    };
    await this.prisma.questionImportJob.update({
      where: { id: jobId },
      data: { status: 'importing' },
    });
    const language = meta.language ?? Language.ru;
    let imported = 0;
    try {
      for (const item of questions) {
        await this.createQuestion(item, meta, language);
        imported += 1;
        if (imported % 50 === 0) {
          await this.prisma.questionImportJob.update({
            where: { id: jobId },
            data: { imported },
          });
        }
      }
      await this.prisma.questionImportJob.update({
        where: { id: jobId },
        data: { status: 'done', imported, finishedAt: new Date() },
      });
    } catch (error) {
      await this.prisma.questionImportJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          imported,
          errors: [error instanceof Error ? error.message : 'import failed'],
          finishedAt: new Date(),
        },
      });
    }
  }

  private createQuestion(item: ImportedQuestion, meta: ImportMeta, language: Language) {
    const type = TYPE_MAP[item.type] as QuestionType;
    const answers = Array.isArray(item.correct_answer)
      ? item.correct_answer
      : [item.correct_answer];
    return this.prisma.question.create({
      data: {
        type,
        disciplineId: meta.disciplineId,
        courseId: meta.courseId,
        sectionId: meta.sectionId,
        lessonId: meta.lessonId,
        imageKey: item.image ?? null,
        translations: {
          create: [
            {
              language,
              prompt: item.question,
              explanation: item.explanation,
            },
          ],
        },
        options: {
          create: item.options.map((option, index) => ({
            code: option.id,
            isCorrect: answers.includes(option.id),
            sortOrder: type === QuestionType.ORDERING ? Math.max(0, answers.indexOf(option.id)) : index,
            translations: {
              create: [{ language, text: option.text }],
            },
          })),
        },
      },
    });
  }
}

export function validateQuestions(questions: ImportedQuestion[]): string[] {
  if (!Array.isArray(questions) || questions.length === 0) {
    return ['Question 1: questions array is empty'];
  }
  const errors: string[] = [];
  questions.forEach((item, index) => {
    const n = index + 1;
    if (!item || typeof item.question !== 'string' || item.question.trim() === '') {
      errors.push(`Question ${n}: question text is required`);
      return;
    }
    if (!(item.type in TYPE_MAP)) {
      errors.push(`Question ${n}: unknown type`);
      return;
    }
    if (!Array.isArray(item.options) || item.options.length < 2) {
      errors.push(`Question ${n}: at least two options are required`);
      return;
    }
    const ids = item.options.map((option) => option.id);
    if (new Set(ids).size !== ids.length) {
      errors.push(`Question ${n}: duplicate option id`);
    }
    const answers = Array.isArray(item.correct_answer)
      ? item.correct_answer
      : [item.correct_answer];
    for (const answer of answers) {
      if (!ids.includes(answer)) {
        errors.push(`Question ${n}: correct_answer does not exist`);
      }
    }
  });
  return errors;
}

export function normalizeImportedQuestions(raw: unknown[]): ImportedQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    if (typeof row.question === 'string' && Array.isArray(row.options)) {
      return {
        type: ((row.type as ImportedQuestion['type']) in { single_choice: 1, true_false: 1, matching: 1, ordering: 1, image_single_choice: 1 }
          ? (row.type as ImportedQuestion['type'])
          : 'single_choice'),
        question: row.question,
        options: row.options as ImportedQuestion['options'],
        correct_answer: (row.correct_answer as string | string[]) ?? 'A',
        explanation: typeof row.explanation === 'string' ? row.explanation : undefined,
      };
    }
    const answers = Array.isArray(row.answers) ? (row.answers as { answerText?: string; text?: string; isCorrect?: boolean }[]) : [];
    const options = answers.map((answer, index) => ({
      id: String.fromCharCode(65 + index),
      text: String(answer.answerText ?? answer.text ?? ''),
    }));
    const correct = answers
      .map((answer, index) => (answer.isCorrect ? String.fromCharCode(65 + index) : ''))
      .filter(Boolean);
    return {
      type: 'single_choice' as const,
      question: String(row.questionText ?? row.question ?? ''),
      options,
      correct_answer: correct.length <= 1 ? (correct[0] ?? 'A') : correct,
    };
  });
}
