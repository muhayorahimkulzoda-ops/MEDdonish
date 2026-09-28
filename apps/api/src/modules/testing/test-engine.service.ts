import { Injectable } from '@nestjs/common';
import { AnswerVerdict, TestMode } from '@prisma/client';
import { AppException } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService, SETTING_KEYS } from '../settings/settings.service';
import { DEFAULT_GRADE_SETTINGS, gradeAttempt, shuffle } from './grading';

@Injectable()
export class TestEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async start(userId: string, testId: string) {
    const test = await this.prisma.test.findUniqueOrThrow({
      where: { id: testId },
      include: {
        pool: { include: { question: { include: { options: true } } } },
      },
    });
    if (!test.isActive) throw new AppException('TEST_INACTIVE', 'Test is not active');

    const active = test.pool
      .map((item) => item.question)
      .filter((question) => question.isActive);
    if (active.length === 0) {
      throw new AppException('TEST_EMPTY', 'Question pool is empty');
    }

    const last = await this.prisma.testAttempt.findFirst({
      where: { userId, testId, finishedAt: { not: null } },
      orderBy: { startedAt: 'desc' },
      include: { questions: true },
    });
    const recent = new Set(last?.questions.map((item) => item.questionId) ?? []);
    const preferred = active.filter((question) => !recent.has(question.id));
    const fallback = active.filter((question) => recent.has(question.id));
    const count = Math.min(test.questionCount, active.length);
    const selected = shuffle(preferred).concat(shuffle(fallback)).slice(0, count);

    const attempt = await this.prisma.testAttempt.create({
      data: {
        userId,
        testId,
        currentIndex: 0,
        questions: {
          create: selected.map((question, position) => {
            const codes = question.options.map((option) => option.code);
            return {
              questionId: question.id,
              position,
              optionOrder: test.randomizeAnswers ? shuffle(codes) : codes,
            };
          }),
        },
      },
    });
    return this.publicAttempt(attempt.id);
  }

  async currentQuestion(attemptId: string, userId: string) {
    const attempt = await this.loadAttempt(attemptId, userId);
    if (attempt.finishedAt) return this.result(attemptId, userId);
    await this.timeoutIfNeeded(attempt);
    const refreshed = await this.loadAttempt(attemptId, userId);
    if (refreshed.finishedAt) return this.result(attemptId, userId);

    const item = refreshed.questions[refreshed.currentIndex];
    if (!item) return this.result(attemptId, userId);

    if (!refreshed.questionOpenedAt) {
      await this.prisma.testAttempt.update({
        where: { id: attemptId },
        data: { questionOpenedAt: new Date() },
      });
    }
    const opened = refreshed.questionOpenedAt ?? new Date();
    const secondsLeft = Math.max(
      0,
      refreshed.test.timePerQuestion - Math.floor((Date.now() - opened.getTime()) / 1000),
    );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredLanguage: true },
    });
    const language = user?.preferredLanguage ?? 'ru';
    const translation =
      item.question.translations.find((row) => row.language === language) ??
      item.question.translations[0];
    const options = item.optionOrder.map((code) => {
      const option = item.question.options.find((row) => row.code === code);
      const text =
        option?.translations.find((row) => row.language === language)?.text ??
        option?.translations[0]?.text ??
        code;
      return { id: code, text };
    });

    return {
      finished: false,
      attemptId,
      position: item.position + 1,
      total: refreshed.questions.length,
      secondsLeft,
      timePerQuestion: refreshed.test.timePerQuestion,
      mode: refreshed.test.mode,
      type: item.question.type,
      image: item.question.imageKey?.startsWith('http') ? item.question.imageKey : null,
      question: translation?.prompt ?? '',
      options,
    };
  }

  async answer(attemptId: string, userId: string, selectedCodes: string[], timedOut = false) {
    const attempt = await this.loadAttempt(attemptId, userId);
    if (attempt.finishedAt) throw new AppException('ATTEMPT_FINISHED', 'Attempt is finished');
    const timedOutAlready = await this.timeoutIfNeeded(attempt);
    const live = await this.loadAttempt(attemptId, userId);
    if (live.finishedAt) return this.result(attemptId, userId);
    if (timedOutAlready) {
      const previous = live.questions[live.currentIndex - 1];
      return previous ? this.afterAnswer(live, previous) : this.currentQuestion(attemptId, userId);
    }

    const item = live.questions[live.currentIndex];
    if (!item) return this.result(attemptId, userId);
    if (item.answer) {
      return this.afterAnswer(live, item);
    }

    const late =
      timedOut ||
      (live.questionOpenedAt
        ? Date.now() - live.questionOpenedAt.getTime() > live.test.timePerQuestion * 1000 + 1500
        : false);
    const correctCodes = correctCodesOf(item.question);
    const verdict = late
      ? AnswerVerdict.timeout
      : isCorrect(item.question.type, selectedCodes, correctCodes)
        ? AnswerVerdict.correct
        : AnswerVerdict.wrong;

    await this.prisma.testAnswer.create({
      data: {
        attemptId,
        attemptQuestionId: item.id,
        verdict,
        selectedCodes: late ? [] : selectedCodes,
      },
    });
    await this.prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        currentIndex: live.currentIndex + 1,
        questionOpenedAt: null,
      },
    });

    const next = await this.loadAttempt(attemptId, userId);
    if (next.currentIndex >= next.questions.length) {
      return this.finish(attemptId, userId);
    }
    return this.afterAnswer(next, { ...item, answer: { verdict, selectedCodes } });
  }

  async finish(attemptId: string, userId: string) {
    const attempt = await this.loadAttempt(attemptId, userId);
    if (!attempt.finishedAt) {
      for (const item of attempt.questions) {
        if (!item.answer) {
          await this.prisma.testAnswer.create({
            data: {
              attemptId,
              attemptQuestionId: item.id,
              verdict: AnswerVerdict.timeout,
              selectedCodes: [],
            },
          });
        }
      }
      const answers = await this.prisma.testAnswer.findMany({ where: { attemptId } });
      const correctCount = answers.filter((row) => row.verdict === 'correct').length;
      const timeoutCount = answers.filter((row) => row.verdict === 'timeout').length;
      const wrongCount = answers.length - correctCount - timeoutCount;
      const settings = await this.gradeSettings();
      const graded = gradeAttempt(correctCount, attempt.questions.length, settings);
      await this.prisma.testAttempt.update({
        where: { id: attemptId },
        data: {
          finishedAt: new Date(),
          correctCount,
          wrongCount,
          timeoutCount,
          score: graded.percent,
          grade: String(graded.grade),
          questionOpenedAt: null,
        },
      });
    }
    return this.result(attemptId, userId);
  }

  async result(attemptId: string, userId: string) {
    const attempt = await this.loadAttempt(attemptId, userId);
    const settings = await this.gradeSettings();
    const graded = gradeAttempt(attempt.correctCount, attempt.questions.length, settings);
    const reveal = Boolean(attempt.finishedAt) || attempt.test.mode === TestMode.TRAINING;
    return {
      attemptId,
      testId: attempt.testId,
      finished: Boolean(attempt.finishedAt),
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      timeoutCount: attempt.timeoutCount,
      score: attempt.score,
      grade: graded.grade,
      passed: graded.passed,
      percent: graded.percent,
      questionCount: attempt.questions.length,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      review: reveal
        ? attempt.questions.map((item) => ({
            position: item.position + 1,
            question: item.question.translations[0]?.prompt,
            verdict: item.answer?.verdict ?? null,
            correctCodes: correctCodesOf(item.question),
            explanation: item.question.translations[0]?.explanation ?? null,
          }))
        : undefined,
    };
  }

  private afterAnswer(
    attempt: Awaited<ReturnType<TestEngineService['loadAttempt']>>,
    item: Awaited<ReturnType<TestEngineService['loadAttempt']>>['questions'][number] | {
      question: { options: { code: string; isCorrect: boolean }[]; translations: { explanation: string | null }[] };
      answer?: { verdict: AnswerVerdict; selectedCodes: string[] };
    },
  ) {
    const reveal = attempt.test.mode === TestMode.TRAINING;
    return {
      finished: false,
      verdict: item.answer?.verdict,
      ...(reveal
        ? {
            correctCodes: correctCodesOf(item.question),
            explanation: item.question.translations[0]?.explanation ?? null,
          }
        : {}),
    };
  }

  private async gradeSettings() {
    return {
      grade5Min: Number(await this.settings.get(SETTING_KEYS.grade5Min, DEFAULT_GRADE_SETTINGS.grade5Min)),
      grade4Min: Number(await this.settings.get(SETTING_KEYS.grade4Min, DEFAULT_GRADE_SETTINGS.grade4Min)),
      grade3Min: Number(await this.settings.get(SETTING_KEYS.grade3Min, DEFAULT_GRADE_SETTINGS.grade3Min)),
      passMin: Number(await this.settings.get(SETTING_KEYS.passMin, DEFAULT_GRADE_SETTINGS.passMin)),
    };
  }

  private async timeoutIfNeeded(attempt: Awaited<ReturnType<TestEngineService['loadAttempt']>>) {
    if (!attempt.questionOpenedAt || attempt.finishedAt) return false;
    const elapsed = Date.now() - attempt.questionOpenedAt.getTime();
    if (elapsed <= attempt.test.timePerQuestion * 1000) return false;
    const item = attempt.questions[attempt.currentIndex];
    if (!item || item.answer) return false;
    await this.prisma.testAnswer.create({
      data: {
        attemptId: attempt.id,
        attemptQuestionId: item.id,
        verdict: AnswerVerdict.timeout,
        selectedCodes: [],
      },
    });
    const nextIndex = attempt.currentIndex + 1;
    const done = nextIndex >= attempt.questions.length;
    await this.prisma.testAttempt.update({
      where: { id: attempt.id },
      data: {
        currentIndex: nextIndex,
        questionOpenedAt: null,
      },
    });
    if (done) await this.finish(attempt.id, attempt.userId);
    return true;
  }

  private async loadAttempt(attemptId: string, userId: string) {
    const attempt = await this.prisma.testAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        test: true,
        questions: {
          orderBy: { position: 'asc' },
          include: {
            answer: true,
            question: { include: { translations: true, options: { include: { translations: true } } } },
          },
        },
      },
    });
    if (!attempt) throw new AppException('ATTEMPT_NOT_FOUND', 'Attempt not found');
    return attempt;
  }

  private publicAttempt(id: string) {
    return this.prisma.testAttempt.findUniqueOrThrow({
      where: { id },
      select: { id: true, testId: true, startedAt: true, currentIndex: true },
    });
  }
}

function correctCodesOf(question: {
  type?: string;
  options: { code: string; isCorrect: boolean; sortOrder?: number }[];
}) {
  const marked = question.options.filter((option) => option.isCorrect);
  if (question.type === 'ORDERING') {
    return [...marked].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((option) => option.code);
  }
  return marked.map((option) => option.code);
}

function isCorrect(type: string, selected: string[], correct: string[]) {
  if (type === 'ORDERING') {
    return selected.length === correct.length && selected.every((code, index) => code === correct[index]);
  }
  const a = [...selected].sort().join('|');
  const b = [...correct].sort().join('|');
  return a === b && selected.length === correct.length;
}
