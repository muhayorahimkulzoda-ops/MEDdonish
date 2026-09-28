import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const pollMs = Number(process.env.NOTIFY_POLL_MS ?? 60_000);
const DAY = 86_400_000;

const COPY: Record<string, { title: string; body: string }> = {
  subscription_expires_7d: { title: 'Срок доступа', body: 'До окончания доступа осталось 7 дней.' },
  subscription_expires_3d: { title: 'Срок доступа', body: 'До окончания доступа осталось 3 дня.' },
  subscription_expires_1d: { title: 'Срок доступа', body: 'До окончания доступа остался 1 день.' },
  subscription_expired: {
    title: 'Срок доступа закончился',
    body: 'Оформите новый тариф, чтобы продолжить обучение.',
  },
};

async function enabled(code: string) {
  const row = await prisma.notificationTemplate.findUnique({ where: { code } });
  return Boolean(row?.enabled);
}

async function write(userId: string, code: string, dedupeKey: string) {
  if (!(await enabled(code))) return;
  const template = await prisma.notificationTemplate.findUnique({ where: { code } });
  if (!template) return;
  const text = COPY[code];
  try {
    await prisma.notification.create({
      data: {
        userId,
        templateId: template.id,
        title: text.title,
        body: text.body,
        dedupeKey,
      },
    });
  } catch {
    // duplicate reminder
  }
}

async function scan() {
  await prisma.entitlement.updateMany({
    where: { status: 'active', expiresAt: { lte: new Date() } },
    data: { status: 'expired' },
  });
  await prisma.subscription.updateMany({
    where: { status: 'active', expiresAt: { lte: new Date() } },
    data: { status: 'expired' },
  });

  const now = Date.now();
  const windows = [
    { code: 'subscription_expires_7d', min: now + 6.5 * DAY, max: now + 7.5 * DAY },
    { code: 'subscription_expires_3d', min: now + 2.5 * DAY, max: now + 3.5 * DAY },
    { code: 'subscription_expires_1d', min: now + 0.5 * DAY, max: now + 1.5 * DAY },
  ];
  for (const window of windows) {
    const rows = await prisma.entitlement.findMany({
      where: {
        status: 'active',
        expiresAt: { gte: new Date(window.min), lte: new Date(window.max) },
      },
    });
    for (const row of rows) {
      await write(row.userId, window.code, `${window.code}:${row.id}:${row.expiresAt.toISOString().slice(0, 10)}`);
    }
  }
  const expired = await prisma.entitlement.findMany({
    where: {
      status: 'expired',
      expiresAt: { gte: new Date(now - DAY), lte: new Date() },
    },
  });
  for (const row of expired) {
    await write(
      row.userId,
      'subscription_expired',
      `subscription_expired:${row.id}:${row.expiresAt.toISOString().slice(0, 10)}`,
    );
  }
}

async function loop() {
  await scan().catch(() => undefined);
}

console.log('MEDdonish notify worker started');
void loop();
setInterval(() => {
  void loop();
}, pollMs);
