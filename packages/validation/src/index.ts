import { z } from 'zod';

export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'phone must be E.164');

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const devicePayloadSchema = z.object({
  deviceId: z.string().min(8).max(128),
  platform: z.enum(['web', 'android', 'ios']),
  deviceModel: z.string().max(120).optional(),
  appVersion: z.string().max(40).optional(),
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/),
  device: devicePayloadSchema,
});

export const loginSchema = z.object({
  phone: phoneSchema,
  pin: z.string().min(4).max(64),
  device: devicePayloadSchema,
});

export const questionOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const importedQuestionSchema = z
  .object({
    type: z.enum([
      'single_choice',
      'true_false',
      'matching',
      'ordering',
      'image_single_choice',
    ]),
    question: z.string().min(1),
    image: z.string().nullable().optional(),
    options: z.array(questionOptionSchema).min(2),
    correct_answer: z.union([z.string(), z.array(z.string())]),
    explanation: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const optionIds = new Set(value.options.map((option) => option.id));
    const answers = Array.isArray(value.correct_answer)
      ? value.correct_answer
      : [value.correct_answer];

    for (const answer of answers) {
      if (!optionIds.has(answer)) {
        ctx.addIssue({
          code: 'custom',
          message: `correct_answer does not exist`,
          path: ['correct_answer'],
        });
      }
    }
  });

export const questionImportSchema = z.object({
  questions: z.array(importedQuestionSchema).min(1),
});

export function formatImportError(index: number, message: string): string {
  return `Question ${index + 1}: ${message}`;
}
