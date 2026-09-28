import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';

export async function loadPublishedLessonQuiz(prisma: PrismaService, lessonId: string, lang?: string) {
  const language = lang === 'tg' || lang === 'en' || lang === 'ru' ? lang : 'ru';
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      status: 'published',
      section: { status: 'published', course: { status: 'published' } },
    },
    include: {
      tests: {
        where: { isActive: true },
        take: 1,
        include: {
          pool: {
            include: {
              question: { include: { translations: true, options: { include: { translations: true } } } },
            },
          },
        },
      },
    },
  });
  if (!lesson) throw new AppException('LESSON_NOT_FOUND', 'Lesson not found', HttpStatus.NOT_FOUND);
  const test = lesson.tests[0];
  if (!test) throw new AppException('TEST_NOT_FOUND', 'Test not found', HttpStatus.NOT_FOUND);
  return { lesson, test, language };
}

export function quizPayload(
  test: Awaited<ReturnType<typeof loadPublishedLessonQuiz>>['test'],
  language: string,
  maxQuestions?: number,
) {
  const limit = maxQuestions ?? test.questionCount;
  const questions = test.pool
    .map((item) => item.question)
    .filter((question) => question.isActive)
    .slice(0, limit);
  if (questions.length === 0) {
    throw new AppException('TEST_EMPTY', 'Question pool is empty', HttpStatus.NOT_FOUND);
  }
  return {
    questions,
    payload: {
      testId: test.id,
      title: test.title,
      questionCount: questions.length,
      questions: questions.map((question) => {
        const translation =
          question.translations.find((row) => row.language === language) ?? question.translations[0];
        return {
          id: question.id,
          prompt: translation?.prompt ?? '',
          options: question.options
            .slice()
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((option) => ({
              id: option.code,
              text:
                option.translations.find((row) => row.language === language)?.text ??
                option.translations[0]?.text ??
                option.code,
            })),
        };
      }),
    },
  };
}
