import { Language } from '@prisma/client';

export const TEMPLATE_COPY: Record<string, Record<Language, { title: string; body: string }>> = {
  subscription_expires_7d: {
    ru: { title: 'Срок доступа', body: 'До окончания доступа осталось 7 дней.' },
    tg: { title: 'Мӯҳлати дастрасӣ', body: 'То анҷоми дастрасӣ 7 рӯз монд.' },
    en: { title: 'Access ending', body: 'Your access expires in 7 days.' },
  },
  subscription_expires_3d: {
    ru: { title: 'Срок доступа', body: 'До окончания доступа осталось 3 дня.' },
    tg: { title: 'Мӯҳлати дастрасӣ', body: 'То анҷоми дастрасӣ 3 рӯз монд.' },
    en: { title: 'Access ending', body: 'Your access expires in 3 days.' },
  },
  subscription_expires_1d: {
    ru: { title: 'Срок доступа', body: 'До окончания доступа остался 1 день.' },
    tg: { title: 'Мӯҳлати дастрасӣ', body: 'То анҷоми дастрасӣ 1 рӯз монд.' },
    en: { title: 'Access ending', body: 'Your access expires in 1 day.' },
  },
  subscription_expired: {
    ru: { title: 'Срок доступа закончился', body: 'Оформите новый тариф, чтобы продолжить обучение.' },
    tg: { title: 'Мӯҳлати дастрасӣ тамом шуд', body: 'Барои идома тарифи нав гиред.' },
    en: { title: 'Access expired', body: 'Buy a new plan to continue learning.' },
  },
  new_lesson: {
    ru: { title: 'Новый урок', body: 'В курсе появился новый урок.' },
    tg: { title: 'Дарси нав', body: 'Дар курс дарси нав пайдо шуд.' },
    en: { title: 'New lesson', body: 'A new lesson was published.' },
  },
  new_course: {
    ru: { title: 'Новый курс', body: 'Опубликован новый курс.' },
    tg: { title: 'Курси нав', body: 'Курси нав нашр шуд.' },
    en: { title: 'New course', body: 'A new course was published.' },
  },
  new_test: {
    ru: { title: 'Новый тест', body: 'В курсе появился новый тест.' },
    tg: { title: 'Тести нав', body: 'Дар курс тести нав пайдо шуд.' },
    en: { title: 'New test', body: 'A new test was published.' },
  },
  system: {
    ru: { title: 'Системное уведомление', body: 'Сообщение от MEDdonish.' },
    tg: { title: 'Огоҳии системавӣ', body: 'Паём аз MEDdonish.' },
    en: { title: 'System notice', body: 'A message from MEDdonish.' },
  },
};

export function copyFor(code: string, language: Language, fallback?: { title?: string; body?: string }) {
  const item = TEMPLATE_COPY[code]?.[language] ?? TEMPLATE_COPY[code]?.ru;
  return {
    title: fallback?.title || item?.title || code,
    body: fallback?.body || item?.body || code,
  };
}
