import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Injectable, Logger } from '@nestjs/common';

type TelegramMessage = {
  messageId: number;
  chatId: number;
};

export function extractStartChatId(update: Record<string, unknown>): number | null {
  const message = update.message as { text?: string; chat?: { id?: number } } | undefined;
  const text = message?.text?.trim() ?? '';
  if (!text.startsWith('/start')) return null;
  const id = Number(message?.chat?.id);
  return Number.isFinite(id) && id !== 0 ? id : null;
}

@Injectable()
export class TelegramReviewAdapter {
  private readonly logger = new Logger(TelegramReviewAdapter.name);

  hasToken() {
    return Boolean(process.env.TELEGRAM_BOT_TOKEN);
  }

  configured() {
    return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_PAYMENT_CHAT_ID);
  }

  async bindAdminChatFromUpdate(update: Record<string, unknown>) {
    const chatId = extractStartChatId(update);
    if (!chatId || !this.hasToken()) return;
    const previous = process.env.TELEGRAM_PAYMENT_CHAT_ID;
    if (previous && previous !== String(chatId)) return;
    if (!previous) {
      persistChatId(String(chatId));
      this.logger.log('telegram admin chat bound');
    }
    await this.api('sendMessage', {
      chat_id: chatId,
      text: previous
        ? 'MEDdonish аллакай пайваст аст. Чекҳои пардохт ба ҳамин чат меоянд.'
        : 'MEDdonish пайваст шуд. Чекҳои пардохт ба ҳамин чат меоянд. Ҳа — дастрасӣ кушода мешавад, Не — намешавад.',
    });
  }

  async sendPaymentReview(input: {
    orderId: string;
    method: string;
    phone: string;
    amountMinor: number;
    currency: string;
    note?: string;
    photo?: { buffer: Buffer; filename: string; mime: string };
  }): Promise<TelegramMessage | null> {
    if (!this.configured()) {
      this.logger.log('telegram review skipped: bot is not configured');
      return null;
    }
    const amount = (input.amountMinor / 100).toFixed(2);
    const text = [
      'MEDdonish · пардохт',
      `Order: ${input.orderId}`,
      `Усул: ${input.method}`,
      `Телефон: ${input.phone}`,
      `Маблағ: ${amount} ${input.currency}`,
      input.note ? `Чек: ${input.note}` : 'Чек замима шуд',
      '',
      'Ҳа = кушодани курсҳо · Не = дастрасӣ нест',
    ].join('\n');
    const keyboard = {
      inline_keyboard: [
        [
          { text: 'Ҳа ✅', callback_data: `p:y:${input.orderId}` },
          { text: 'Не ❌', callback_data: `p:n:${input.orderId}` },
        ],
      ],
    };
    const sent = input.photo
      ? await this.sendPhoto(text, keyboard, input.photo)
      : await this.api('sendMessage', {
          chat_id: process.env.TELEGRAM_PAYMENT_CHAT_ID,
          text,
          reply_markup: keyboard,
        });
    const payload =
      sent ??
      (input.photo ? await this.sendDocument(text, keyboard, input.photo) : null) ??
      (await this.api('sendMessage', {
        chat_id: process.env.TELEGRAM_PAYMENT_CHAT_ID,
        text,
        reply_markup: keyboard,
      }));
    const messageId = Number(payload?.result?.message_id);
    const chatId = Number(payload?.result?.chat?.id);
    if (!messageId || !chatId) return null;
    return { messageId, chatId };
  }

  async markDecision(chatId: number, messageId: number, approved: boolean, callbackId?: string) {
    if (!this.configured()) return;
    const mark = approved ? '✅ Ҳа · дастрасӣ кушода шуд' : '❌ Не · дастрасӣ кушода нашуд';
    await this.api('editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: mark, callback_data: 'p:done' }]] },
    }).catch(() => undefined);
    if (callbackId) {
      await this.answerCallback(callbackId, approved ? 'Ҳа' : 'Не');
    }
  }

  async answerCallback(callbackId: string, text: string) {
    await this.api('answerCallbackQuery', { callback_query_id: callbackId, text }).catch(() => undefined);
  }

  parseCallback(body: Record<string, unknown>) {
    const query = body.callback_query as
      | {
          id?: string;
          data?: string;
          message?: { message_id?: number; chat?: { id?: number } };
        }
      | undefined;
    if (!query?.data || !query.data.startsWith('p:')) return null;
    const [, decision, orderId] = query.data.split(':');
    if ((decision !== 'y' && decision !== 'n') || !orderId) return null;
    return {
      callbackId: String(query.id ?? ''),
      approved: decision === 'y',
      orderId,
      messageId: Number(query.message?.message_id ?? 0),
      chatId: Number(query.message?.chat?.id ?? 0),
    };
  }

  verifyWebhookSecret(header?: string) {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expected) return process.env.NODE_ENV !== 'production';
    return Boolean(header && header === expected);
  }

  private async sendPhoto(
    caption: string,
    replyMarkup: Record<string, unknown>,
    photo: { buffer: Buffer; filename: string; mime: string },
  ) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return null;
    const form = new FormData();
    form.set('chat_id', String(process.env.TELEGRAM_PAYMENT_CHAT_ID));
    form.set('caption', caption.slice(0, 1024));
    form.set('reply_markup', JSON.stringify(replyMarkup));
    form.set('photo', new Blob([new Uint8Array(photo.buffer)], { type: photo.mime }), photo.filename);
    const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      this.logger.warn(`telegram sendPhoto failed: ${await telegramError(response)}`);
      return null;
    }
    return (await response.json()) as { result?: { message_id?: number; chat?: { id?: number } } };
  }

  private async sendDocument(
    caption: string,
    replyMarkup: Record<string, unknown>,
    photo: { buffer: Buffer; filename: string; mime: string },
  ) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return null;
    const form = new FormData();
    form.set('chat_id', String(process.env.TELEGRAM_PAYMENT_CHAT_ID));
    form.set('caption', caption.slice(0, 1024));
    form.set('reply_markup', JSON.stringify(replyMarkup));
    form.set(
      'document',
      new Blob([new Uint8Array(photo.buffer)], { type: photo.mime }),
      photo.filename || 'check.jpg',
    );
    const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      this.logger.warn(`telegram sendDocument failed: ${await telegramError(response)}`);
      return null;
    }
    return (await response.json()) as { result?: { message_id?: number; chat?: { id?: number } } };
  }

  private async api(method: string, payload: Record<string, unknown>) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return null;
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      this.logger.warn(`telegram ${method} failed: ${await telegramError(response)}`);
      return null;
    }
    return (await response.json()) as { result?: { message_id?: number; chat?: { id?: number } } };
  }

  async deleteWebhook() {
    await this.api('deleteWebhook', { drop_pending_updates: false });
  }

  async getUpdates(offset: number) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return [];
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?timeout=20&offset=${offset}`,
      { signal: AbortSignal.timeout(40_000) },
    );
    if (!response.ok) return [];
    const body = (await response.json()) as { result?: Record<string, unknown>[] };
    return body.result ?? [];
  }
}

async function telegramError(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { description?: string };
  return body.description || String(response.status);
}

function persistChatId(chatId: string) {
  process.env.TELEGRAM_PAYMENT_CHAT_ID = chatId;
  const files = [join(process.cwd(), '.env'), join(process.cwd(), '../../.env')];
  for (const file of files) {
    try {
      if (!existsSync(file)) continue;
      const text = readFileSync(file, 'utf8');
      const next = /^TELEGRAM_PAYMENT_CHAT_ID=/m.test(text)
        ? text.replace(/^TELEGRAM_PAYMENT_CHAT_ID=.*$/m, `TELEGRAM_PAYMENT_CHAT_ID=${chatId}`)
        : `${text.trimEnd()}\nTELEGRAM_PAYMENT_CHAT_ID=${chatId}\n`;
      writeFileSync(file, next);
    } catch {
      // env files are optional; in-memory value is enough for this process
    }
  }
}
