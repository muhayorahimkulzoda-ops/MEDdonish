import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Errors } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';

export const SETTING_KEYS = {
  grade5Min: 'grade_5_min',
  grade4Min: 'grade_4_min',
  grade3Min: 'grade_3_min',
  passMin: 'pass_min',
  videoCompletedPercent: 'video_completed_percent',
  freePreviewLimit: 'free_preview_limit',
  singleDevicePolicy: 'single_device_policy',
  defaultQuestionCount: 'default_question_count',
  secondsPerQuestion: 'seconds_per_question',
  telegramContactUrl: 'telegram_contact_url',
  commerceChannel: 'commerce_channel',
} as const;

export const SETTING_DEFAULTS: Record<string, number | string> = {
  [SETTING_KEYS.grade5Min]: 28,
  [SETTING_KEYS.grade4Min]: 24,
  [SETTING_KEYS.grade3Min]: 15,
  [SETTING_KEYS.passMin]: 15,
  [SETTING_KEYS.videoCompletedPercent]: 90,
  [SETTING_KEYS.freePreviewLimit]: 1,
  [SETTING_KEYS.singleDevicePolicy]: 'require_release',
  [SETTING_KEYS.defaultQuestionCount]: 30,
  [SETTING_KEYS.secondsPerQuestion]: 20,
  [SETTING_KEYS.telegramContactUrl]: '',
  [SETTING_KEYS.commerceChannel]: 'manual_telegram',
};

const ALLOWED = new Set(Object.values(SETTING_KEYS));

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row ? (row.value as T) : fallback;
  }

  getDevicePolicy() {
    return this.get<'require_release' | 'auto_revoke'>(
      SETTING_KEYS.singleDevicePolicy,
      'require_release',
    );
  }

  async list() {
    const rows = await this.prisma.setting.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row]));
    const values: Record<string, number | string> = {};
    const updatedAt: Record<string, string | null> = {};
    for (const key of Object.values(SETTING_KEYS)) {
      const row = byKey.get(key);
      values[key] = row ? (row.value as number | string) : SETTING_DEFAULTS[key];
      updatedAt[key] = row?.updatedAt.toISOString() ?? null;
    }
    return { values, updatedAt };
  }

  async update(patch: Partial<Record<string, number | string>>) {
    const current = await this.list();
    const next = { ...current.values };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (!ALLOWED.has(key as (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS])) {
        throw Errors.settingInvalid(`Unknown setting: ${key}`);
      }
      next[key] = value;
    }
    assertGradeOrder(next);

    const writes = Object.entries(patch)
      .filter((entry): entry is [string, number | string] => entry[1] !== undefined)
      .map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { key },
          update: { value: value as Prisma.InputJsonValue },
          create: { key, value: value as Prisma.InputJsonValue },
        }),
      );
    if (writes.length) await this.prisma.$transaction(writes);
    return this.list();
  }
}

function assertGradeOrder(values: Record<string, number | string>) {
  const grade5 = Number(values.grade_5_min);
  const grade4 = Number(values.grade_4_min);
  const grade3 = Number(values.grade_3_min);
  const pass = Number(values.pass_min);
  if (!(grade5 >= grade4 && grade4 >= grade3 && grade3 >= pass)) {
    throw Errors.settingInvalid('Grade thresholds must satisfy 5 >= 4 >= 3 >= pass');
  }
}
