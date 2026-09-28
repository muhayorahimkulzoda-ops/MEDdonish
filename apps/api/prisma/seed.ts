import { hash } from 'bcrypt';
import {
  AccessSource,
  EntitlementStatus,
  PaymentSource,
  PaymentStatus,
  PrismaClient,
  PublishStatus,
  QuestionType,
  TestMode,
  UserStatus,
  VideoStatus,
} from '@prisma/client';
import { YEAR3_COURSES } from './year3-content';

const prisma = new PrismaClient();

const DEMO_PHONE = '+992900000001';
const DEMO_PIN = '2580';

async function main() {
  const month1 = await prisma.plan.upsert({
    where: { code: 'month_1' },
    update: {},
    create: { code: 'month_1', durationDays: 30 },
  });
  const month5 = await prisma.plan.upsert({
    where: { code: 'month_5' },
    update: {},
    create: { code: 'month_5', durationDays: 150 },
  });
  const year1 = await prisma.plan.upsert({
    where: { code: 'year_1' },
    update: {},
    create: { code: 'year_1', durationDays: 365 },
  });

  const settings: Record<string, number | string> = {
    grade_5_min: 28,
    grade_4_min: 24,
    grade_3_min: 15,
    pass_min: 15,
    video_completed_percent: 90,
    free_preview_limit: 1,
    single_device_policy: 'require_release',
    default_question_count: 30,
    seconds_per_question: 20,
  };

  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  for (const code of [
    'subscription_expires_7d',
    'subscription_expires_3d',
    'subscription_expires_1d',
    'subscription_expired',
    'new_lesson',
    'new_course',
    'new_test',
    'system',
  ]) {
    await prisma.notificationTemplate.upsert({
      where: { code },
      update: {},
      create: { code, enabled: true },
    });
  }

  const email = process.env.ADMIN_BOOTSTRAP_EMAIL ?? 'admin@meddonish.local';
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? 'MeddonishAdmin2026';
  const passwordHash = await hash(password, 12);
  const admin = await prisma.adminAccount.upsert({
    where: { email },
    update: { passwordHash, totpEnabled: false },
    create: {
      email,
      passwordHash,
      totpEnabled: false,
    },
  });

  const anatomy = await upsertDiscipline('anatomy', 1, 'Анатомия', 'Анатомия', 'Кости, суставы и ориентиры.');
  const cardio = await upsertDiscipline('cardiology', 2, 'Кардиология', 'Кардиология', 'Сердечно-сосудистая система.');
  const surgery = await upsertDiscipline('surgery', 3, 'Хирургия', 'Ҷарроҳӣ', 'Базовые хирургические навыки.');

  const osteo = await upsertCourse({
    slug: 'anatomy-osteo',
    disciplineId: anatomy.id,
    instructor: 'д.м.н. Рахимов А.С.',
    status: PublishStatus.published,
    titleRu: 'Анатомия',
    titleTg: 'Анатомия',
    description: 'Устухонҳои тана ва дасту пой. Дарси озмоишӣ бе пардохт кушода аст.',
    prices: [
      { planId: month1.id, amountMinor: 19900 },
      { planId: month5.id, amountMinor: 79900 },
      { planId: year1.id, amountMinor: 149900 },
    ],
  });

  const cardioCourse = await upsertCourse({
    slug: 'cardio-intro',
    disciplineId: cardio.id,
    instructor: 'к.м.н. Каримова Н.Т.',
    status: PublishStatus.published,
    titleRu: 'Основы кардиологии',
    titleTg: 'Асосҳои кардиология',
    description: 'ЭКГ, боли в груди, неотложная тактика.',
    prices: [
      { planId: month1.id, amountMinor: 24900 },
      { planId: month5.id, amountMinor: 99900 },
      { planId: year1.id, amountMinor: 179900 },
    ],
  });

  await upsertCourse({
    slug: 'surgery-wounds',
    disciplineId: surgery.id,
    instructor: 'проф. Саидов М.И.',
    status: PublishStatus.draft,
    titleRu: 'Раневая хирургия',
    titleTg: 'Ҷарроҳии захм',
    description: 'Черновик: не виден на публичном сайте, пока не опубликуете.',
    prices: [
      { planId: month1.id, amountMinor: 17900 },
      { planId: month5.id, amountMinor: 69900 },
      { planId: year1.id, amountMinor: 129900 },
    ],
  });

  const previewLesson = await seedOsteologyContent(osteo.id, anatomy.id);
  await seedCardiologyContent(cardioCourse.id, cardio.id);
  const year3Courses = await seedYear3Catalog(month1.id, month5.id, year1.id);

  const demoUser = await prisma.user.upsert({
    where: { phone: DEMO_PHONE },
    update: {
      phoneVerified: true,
      status: UserStatus.active,
      lastLoginAt: new Date(),
      pinHash: await hash(DEMO_PIN, 12),
    },
    create: {
      phone: DEMO_PHONE,
      phoneVerified: true,
      status: UserStatus.active,
      preferredLanguage: 'ru',
      lastLoginAt: new Date(),
      pinHash: await hash(DEMO_PIN, 12),
      profile: { create: { displayName: 'Тестовый ученик' } },
    },
  });

  await prisma.device.updateMany({
    where: { userId: demoUser.id, NOT: { deviceId: 'web-checkout' } },
    data: { isActive: false },
  });
  await prisma.device.upsert({
    where: { userId_deviceId: { userId: demoUser.id, deviceId: 'web-checkout' } },
    update: { isActive: true, lastSeenAt: new Date(), platform: 'web' },
    create: {
      userId: demoUser.id,
      deviceId: 'web-checkout',
      platform: 'web',
      deviceModel: 'Chrome',
      appVersion: 'web',
      isActive: true,
    },
  });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const course of [osteo, cardioCourse, ...year3Courses]) {
    const existing = await prisma.entitlement.findFirst({
      where: { userId: demoUser.id, courseId: course.id, status: EntitlementStatus.active },
    });
    if (!existing) {
      await prisma.entitlement.create({
        data: {
          userId: demoUser.id,
          courseId: course.id,
          planId: month1.id,
          source: AccessSource.admin,
          startedAt: now,
          expiresAt,
          status: EntitlementStatus.active,
        },
      });
    }
  }

  const existingOrder = await prisma.order.findFirst({
    where: { phone: DEMO_PHONE, courseId: cardioCourse.id },
  });
  if (!existingOrder) {
    const order = await prisma.order.create({
      data: {
        userId: demoUser.id,
        courseId: cardioCourse.id,
        planId: month1.id,
        phone: DEMO_PHONE,
        amountMinor: 24900,
        currency: 'TJS',
        source: PaymentSource.WEB_PAYMENT,
        status: PaymentStatus.paid,
      },
    });
    await prisma.payment.create({
      data: {
        orderId: order.id,
        source: PaymentSource.WEB_PAYMENT,
        status: PaymentStatus.paid,
        provider: 'demo',
        providerPaymentId: `demo-${order.id}`,
        amountMinor: 24900,
        currency: 'TJS',
      },
    });
    await prisma.entitlement.create({
      data: {
        userId: demoUser.id,
        courseId: cardioCourse.id,
        planId: month1.id,
        source: AccessSource.payment,
        startedAt: now,
        expiresAt,
        status: EntitlementStatus.active,
      },
    });
  }

  const systemTemplate = await prisma.notificationTemplate.findUniqueOrThrow({
    where: { code: 'system' },
  });
  await prisma.notification.upsert({
    where: { dedupeKey: `seed-welcome-${demoUser.id}` },
    update: {},
    create: {
      userId: demoUser.id,
      templateId: systemTemplate.id,
      title: 'Демо-доступ выдан',
      body: 'Админ выдал доступ к курсу «Остеология» для проверки кабинета.',
      dedupeKey: `seed-welcome-${demoUser.id}`,
    },
  });

  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: 'seed_demo_catalog',
      entity: 'catalog',
      entityId: osteo.id,
      ip: '127.0.0.1',
    },
  });

  if (previewLesson) {
    await prisma.videoProgress.upsert({
      where: {
        userId_videoId: {
          userId: demoUser.id,
          videoId: (await prisma.video.findFirstOrThrow({ where: { lessonId: previewLesson.id } })).id,
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        videoId: (await prisma.video.findFirstOrThrow({ where: { lessonId: previewLesson.id } })).id,
        watchSeconds: 540,
        durationSeconds: 600,
        watchPercent: 90,
        completed: true,
      },
    });
  }
}

async function upsertDiscipline(slug: string, sortOrder: number, titleRu: string, titleTg: string, description: string) {
  const discipline = await prisma.discipline.upsert({
    where: { slug },
    update: { status: PublishStatus.published, sortOrder },
    create: {
      slug,
      status: PublishStatus.published,
      sortOrder,
      translations: {
        create: [
          { language: 'ru', title: titleRu, description },
          { language: 'tg', title: titleTg, description },
        ],
      },
    },
  });
  await prisma.disciplineTranslation.upsert({
    where: { disciplineId_language: { disciplineId: discipline.id, language: 'ru' } },
    update: { title: titleRu, description },
    create: { disciplineId: discipline.id, language: 'ru', title: titleRu, description },
  });
  await prisma.disciplineTranslation.upsert({
    where: { disciplineId_language: { disciplineId: discipline.id, language: 'tg' } },
    update: { title: titleTg, description },
    create: { disciplineId: discipline.id, language: 'tg', title: titleTg, description },
  });
  return discipline;
}

async function upsertCourse(input: {
  slug: string;
  disciplineId: string;
  instructor: string;
  status: PublishStatus;
  titleRu: string;
  titleTg: string;
  description: string;
  prices: { planId: string; amountMinor: number }[];
}) {
  const course = await prisma.course.upsert({
    where: { slug: input.slug },
    update: {
      instructor: input.instructor,
      status: input.status,
      disciplineId: input.disciplineId,
    },
    create: {
      slug: input.slug,
      disciplineId: input.disciplineId,
      instructor: input.instructor,
      status: input.status,
      translations: {
        create: [
          { language: 'ru', title: input.titleRu, description: input.description },
          { language: 'tg', title: input.titleTg, description: input.description },
        ],
      },
    },
  });
  await prisma.courseTranslation.upsert({
    where: { courseId_language: { courseId: course.id, language: 'ru' } },
    update: { title: input.titleRu, description: input.description },
    create: {
      courseId: course.id,
      language: 'ru',
      title: input.titleRu,
      description: input.description,
    },
  });
  await prisma.courseTranslation.upsert({
    where: { courseId_language: { courseId: course.id, language: 'tg' } },
    update: { title: input.titleTg, description: input.description },
    create: {
      courseId: course.id,
      language: 'tg',
      title: input.titleTg,
      description: input.description,
    },
  });

  for (const price of input.prices) {
    await prisma.coursePrice.upsert({
      where: { courseId_planId: { courseId: course.id, planId: price.planId } },
      update: { amountMinor: price.amountMinor, currency: 'TJS' },
      create: {
        courseId: course.id,
        planId: price.planId,
        amountMinor: price.amountMinor,
        currency: 'TJS',
      },
    });
  }

  return course;
}

async function seedOsteologyContent(courseId: string, disciplineId: string) {
  const existing = await prisma.section.count({ where: { courseId } });
  if (existing > 0) return prisma.lesson.findFirst({ where: { isFreePreview: true, section: { courseId } } });

  const trunk = await prisma.section.create({
    data: {
      courseId,
      sortOrder: 1,
      status: PublishStatus.published,
      translations: {
        create: [
          { language: 'ru', title: 'Кости туловища' },
          { language: 'tg', title: 'Устухонҳои тана' },
        ],
      },
    },
  });
  const limbs = await prisma.section.create({
    data: {
      courseId,
      sortOrder: 2,
      status: PublishStatus.published,
      translations: {
        create: [
          { language: 'ru', title: 'Кости конечностей' },
          { language: 'tg', title: 'Устухонҳои андомҳо' },
        ],
      },
    },
  });

  const preview = await createLesson({
    sectionId: trunk.id,
    sortOrder: 1,
    isFreePreview: true,
    titleRu: 'Позвоночник',
    titleTg: 'Сутунмуҳра',
    durationSec: 600,
  });
  const thorax = await createLesson({
    sectionId: trunk.id,
    sortOrder: 2,
    isFreePreview: false,
    titleRu: 'Грудная клетка',
    titleTg: 'Қафаси сина',
    durationSec: 720,
  });
  const upperLimb = await createLesson({
    sectionId: limbs.id,
    sortOrder: 1,
    isFreePreview: false,
    titleRu: 'Верхняя конечность',
    titleTg: 'Андоми боло',
    durationSec: 840,
  });

  const questions = await createAnatomyQuestions({
    disciplineId,
    courseId,
    sectionId: trunk.id,
    lessonId: preview.id,
  });

  const training = await prisma.test.create({
    data: {
      title: 'Остеология — тренировка',
      disciplineId,
      courseId,
      lessonId: preview.id,
      questionCount: Math.min(5, questions.length),
      timePerQuestion: 20,
      mode: TestMode.TRAINING,
      isActive: true,
    },
  });
  const exam = await prisma.test.create({
    data: {
      title: 'Остеология — экзамен',
      disciplineId,
      courseId,
      questionCount: questions.length,
      timePerQuestion: 20,
      mode: TestMode.EXAM,
      isActive: true,
    },
  });
  await prisma.testQuestionPool.createMany({
    data: questions.flatMap((question) => [
      { testId: training.id, questionId: question.id },
      { testId: exam.id, questionId: question.id },
    ]),
  });

  await prisma.situationalTask.create({
    data: {
      lessonId: thorax.id,
      kind: 'simple',
      payload: {
        title: 'Перелом ребра',
        vignette: 'Мужчина 34 лет после ДТП. Боль в правой половине грудной клетки, усиливается на вдохе.',
        questions: [
          {
            prompt: 'Какой признак наиболее характерен для перелома ребра?',
            options: [
              { id: 'A', text: 'Локальная болезненность при пальпации' },
              { id: 'B', text: 'Симптом Щёткина–Блюмберга' },
              { id: 'C', text: 'Анизокория' },
              { id: 'D', text: 'Брадикардия' },
            ],
            correct: 'A',
            explanation: 'Локальная боль и крепитация — типичные признаки перелома ребра.',
          },
        ],
      },
    },
  });

  await prisma.clinicalCase.create({
    data: {
      lessonId: upperLimb.id,
      title: 'Перелом лучевой кости в типичном месте',
      patientAge: 68,
      patientSex: 'F',
      complaints: 'Боль и деформация в области лучезапястного сустава после падения на вытянутую руку.',
      history: 'Остеопороз, падение на улице.',
      examination: 'Штыкообразная деформация, болезненность дистального метаэпифиза лучевой кости.',
      laboratory: 'Без особенностей.',
      instrumental: 'Рентген: перелом Коллеса.',
      diagnosis: 'Закрытый перелом дистального метаэпифиза лучевой кости.',
      differential: 'Перелом ладьевидной кости, вывих кисти.',
      discussion: 'Иммобилизация и контроль кровоснабжения кисти.',
      conclusion: 'Гипсовая лонгета, повторный рентген, консультация травматолога.',
      steps: {
        create: [
          { sortOrder: 1, title: 'Осмотр', body: 'Оцените деформацию, пульс на a. radialis и чувствительность пальцев.' },
          { sortOrder: 2, title: 'Визуализация', body: 'Рентген в двух проекциях подтверждает перелом Коллеса.' },
          { sortOrder: 3, title: 'Тактика', body: 'Репозиция, иммобилизация, анальгезия, направление к травматологу.' },
        ],
      },
    },
  });

  return preview;
}

async function seedCardiologyContent(courseId: string, disciplineId: string) {
  const existing = await prisma.section.count({ where: { courseId } });
  if (existing > 0) return;

  const section = await prisma.section.create({
    data: {
      courseId,
      sortOrder: 1,
      status: PublishStatus.published,
      translations: {
        create: [
          { language: 'ru', title: 'Неотложная кардиология' },
          { language: 'tg', title: 'Кардиологияи таъҷилӣ' },
        ],
      },
    },
  });
  const lesson = await createLesson({
    sectionId: section.id,
    sortOrder: 1,
    isFreePreview: true,
    titleRu: 'Боль в груди',
    titleTg: 'Дарди қафаси сина',
    durationSec: 480,
  });

  const q = await prisma.question.create({
    data: {
      type: QuestionType.SINGLE_CHOICE,
      disciplineId,
      courseId,
      lessonId: lesson.id,
      translations: {
        create: [
          { language: 'ru', prompt: 'Первый препарат при подозрении на ОКС у взрослого без противопоказаний?', explanation: 'Ацетилсалициловая кислота — базовая антитромбоцитарная терапия.' },
          { language: 'tg', prompt: 'Аввалин дору ҳангоми гумони ОКС?' },
        ],
      },
      options: {
        create: [
          option('A', 'Ацетилсалициловая кислота', true, 0),
          option('B', 'Дигоксин', false, 1),
          option('C', 'Фуросемид', false, 2),
          option('D', 'Аминофиллин', false, 3),
        ],
      },
    },
  });

  const test = await prisma.test.create({
    data: {
      title: 'Кардиология — мини-тест',
      disciplineId,
      courseId,
      lessonId: lesson.id,
      questionCount: 1,
      timePerQuestion: 20,
      mode: TestMode.TRAINING,
    },
  });
  await prisma.testQuestionPool.create({ data: { testId: test.id, questionId: q.id } });
}

async function createLesson(input: {
  sectionId: string;
  sortOrder: number;
  isFreePreview: boolean;
  titleRu: string;
  titleTg: string;
  durationSec: number;
  notesRu?: string;
  notesTg?: string;
}) {
  const lesson = await prisma.lesson.create({
    data: {
      sectionId: input.sectionId,
      sortOrder: input.sortOrder,
      status: PublishStatus.published,
      isFreePreview: input.isFreePreview,
      durationSec: input.durationSec,
      translations: {
        create: [
          { language: 'ru', title: input.titleRu, body: input.notesRu },
          { language: 'tg', title: input.titleTg, body: input.notesTg },
        ],
      },
    },
  });

  await prisma.video.create({
    data: {
      lessonId: lesson.id,
      status: VideoStatus.READY,
      originalName: `${input.titleRu}.mp4`,
      durationSec: input.durationSec,
      byteSize: BigInt(12_000_000),
      uploadedBytes: BigInt(12_000_000),
      sourceKey: `video/seed/${lesson.id}/source/original`,
      variants: {
        create: {
          quality: '720p',
          protocol: 'hls',
          manifestKey: `video/seed/${lesson.id}/hls/master.m3u8`,
        },
      },
    },
  });

  return lesson;
}

async function seedYear3Catalog(month1Id: string, month5Id: string, year1Id: string) {
  const courses = [];
  for (const spec of YEAR3_COURSES) {
    const discipline = await upsertDiscipline(
      spec.disciplineSlug,
      spec.disciplineSlug === 'pharmacology' ? 10 : spec.disciplineSlug === 'pathophysiology' ? 11 : 12,
      spec.disciplineRu,
      spec.disciplineTg,
      spec.description,
    );
    const course = await upsertCourse({
      slug: spec.slug,
      disciplineId: discipline.id,
      instructor: spec.instructor,
      status: PublishStatus.published,
      titleRu: spec.titleRu,
      titleTg: spec.titleTg,
      description: spec.description,
      prices: [
        { planId: month1Id, amountMinor: 20000 },
        { planId: month5Id, amountMinor: 80000 },
        { planId: year1Id, amountMinor: 150000 },
      ],
    });
    await seedYear3Lessons(course.id, discipline.id, spec.lessons);
    courses.push(course);
  }
  return courses;
}

async function seedYear3Lessons(
  courseId: string,
  disciplineId: string,
  lessons: (typeof YEAR3_COURSES)[number]['lessons'],
) {
  const existing = await prisma.section.count({ where: { courseId } });
  if (existing > 0) {
    const stored = await prisma.lesson.findMany({
      where: { section: { courseId } },
      include: { translations: true, tests: true },
      orderBy: { sortOrder: 'asc' },
    });
    for (const [index, spec] of lessons.entries()) {
      const lesson = stored[index];
      if (!lesson) continue;
      for (const language of ['ru', 'tg'] as const) {
        await prisma.lessonTranslation.upsert({
          where: { lessonId_language: { lessonId: lesson.id, language } },
          update: {
            title: language === 'ru' ? spec.titleRu : spec.titleTg,
            body: language === 'ru' ? spec.notesRu : spec.notesTg,
          },
          create: {
            lessonId: lesson.id,
            language,
            title: language === 'ru' ? spec.titleRu : spec.titleTg,
            body: language === 'ru' ? spec.notesRu : spec.notesTg,
          },
        });
      }
      if (lesson.tests.length === 0) {
        await attachLessonExam(disciplineId, courseId, lesson.sectionId, lesson.id, spec);
      }
    }
    return;
  }

  const section = await prisma.section.create({
    data: {
      courseId,
      sortOrder: 1,
      status: PublishStatus.published,
      translations: {
        create: [
          { language: 'ru', title: '3 курс' },
          { language: 'tg', title: '3 курс' },
        ],
      },
    },
  });

  for (const [index, spec] of lessons.entries()) {
    const lesson = await createLesson({
      sectionId: section.id,
      sortOrder: index + 1,
      isFreePreview: spec.preview,
      titleRu: spec.titleRu,
      titleTg: spec.titleTg,
      durationSec: 720,
      notesRu: spec.notesRu,
      notesTg: spec.notesTg,
    });
    await attachLessonExam(disciplineId, courseId, section.id, lesson.id, spec);
  }
}

async function attachLessonExam(
  disciplineId: string,
  courseId: string,
  sectionId: string,
  lessonId: string,
  spec: (typeof YEAR3_COURSES)[number]['lessons'][number],
) {
  const created = [];
  for (const item of spec.questions) {
    created.push(
      await prisma.question.create({
        data: {
          type: QuestionType.SINGLE_CHOICE,
          disciplineId,
          courseId,
          sectionId,
          lessonId,
          translations: {
            create: [
              { language: 'ru', prompt: item.q, explanation: item.exp },
              { language: 'tg', prompt: item.q, explanation: item.exp },
            ],
          },
          options: {
            create: [
              option('A', item.a, item.correct === 'A', 0),
              option('B', item.b, item.correct === 'B', 1),
              option('C', item.c, item.correct === 'C', 2),
              option('D', item.d, item.correct === 'D', 3),
            ],
          },
        },
      }),
    );
  }
  const test = await prisma.test.create({
    data: {
      title: spec.titleRu,
      disciplineId,
      courseId,
      lessonId,
      questionCount: 30,
      timePerQuestion: 20,
      mode: TestMode.EXAM,
      isActive: true,
    },
  });
  await prisma.testQuestionPool.createMany({
    data: created.map((question) => ({ testId: test.id, questionId: question.id })),
  });
}

function option(code: string, text: string, isCorrect: boolean, sortOrder: number) {
  return {
    code,
    isCorrect,
    sortOrder,
    translations: {
      create: [
        { language: 'ru' as const, text },
        { language: 'tg' as const, text },
      ],
    },
  };
}

async function createAnatomyQuestions(input: {
  disciplineId: string;
  courseId: string;
  sectionId: string;
  lessonId: string;
}) {
  const items: { prompt: string; correct: string; a: string; b: string; c: string; d: string; explanation: string }[] = [
    {
      prompt: 'Сколько шейных позвонков у человека?',
      correct: 'A',
      a: '7',
      b: '12',
      c: '5',
      d: '8',
      explanation: 'Шейный отдел состоит из семи позвонков (C1–C7).',
    },
    {
      prompt: 'Как называется первый шейный позвонок?',
      correct: 'B',
      a: 'Axis',
      b: 'Atlas',
      c: 'Promontorium',
      d: 'Dens',
      explanation: 'C1 — атлант (atlas).',
    },
    {
      prompt: 'Где находится odontoid process (зуб)?',
      correct: 'C',
      a: 'На C1',
      b: 'На C7',
      c: 'На C2',
      d: 'На T1',
      explanation: 'Зуб — отросток осевого позвонка C2.',
    },
    {
      prompt: 'Сколько пар рёбер у человека в норме?',
      correct: 'A',
      a: '12',
      b: '10',
      c: '8',
      d: '14',
      explanation: 'Обычно 12 пар рёбер.',
    },
    {
      prompt: 'Какая кость не входит в пояс верхней конечности?',
      correct: 'D',
      a: 'Ключица',
      b: 'Лопатка',
      c: 'Clavicula',
      d: 'Бедренная кость',
      explanation: 'Бедренная кость относится к нижней конечности.',
    },
  ];

  const created = [];
  for (const item of items) {
    created.push(
      await prisma.question.create({
        data: {
          type: QuestionType.SINGLE_CHOICE,
          disciplineId: input.disciplineId,
          courseId: input.courseId,
          sectionId: input.sectionId,
          lessonId: input.lessonId,
          translations: {
            create: [
              { language: 'ru', prompt: item.prompt, explanation: item.explanation },
              { language: 'tg', prompt: item.prompt, explanation: item.explanation },
            ],
          },
          options: {
            create: [
              option('A', item.a, item.correct === 'A', 0),
              option('B', item.b, item.correct === 'B', 1),
              option('C', item.c, item.correct === 'C', 2),
              option('D', item.d, item.correct === 'D', 3),
            ],
          },
        },
      }),
    );
  }
  return created;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
