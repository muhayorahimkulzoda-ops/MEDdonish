import { Injectable } from '@nestjs/common';
import { Socket } from 'net';
import { access, constants } from 'node:fs/promises';
import { PrismaService } from '../../prisma/prisma.service';

const startedAt = Date.now();

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async publicCheck() {
    const [postgres, redis] = await Promise.all([this.postgres(), this.redis()]);
    const status = !postgres.ok ? 'down' : !redis.ok ? 'degraded' : 'ok';
    return {
      status,
      service: 'meddonish-api',
      checks: { postgres, redis },
    };
  }

  async adminCheck() {
    const publicCheck = await this.publicCheck();
    const [pendingVideoJobs, failedPayments24h, failedSms24h, storage] = await Promise.all([
      this.prisma.videoJob.count({ where: { status: 'pending' } }),
      this.prisma.payment.count({
        where: { status: 'failed', createdAt: { gte: new Date(Date.now() - 86_400_000) } },
      }),
      this.prisma.smsDelivery.count({
        where: { status: 'failed', createdAt: { gte: new Date(Date.now() - 86_400_000) } },
      }),
      this.storageOk(),
    ]);
    const provider = process.env.SMS_PROVIDER ?? 'console';
    return {
      ...publicCheck,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      pendingVideoJobs,
      failedPayments24h,
      storage,
      sms: {
        provider,
        configured: provider === 'console' || Boolean(process.env.SMS_API_URL && process.env.SMS_API_KEY),
        failed24h: failedSms24h,
      },
      payments: {
        provider: process.env.WEB_PAYMENT_PROVIDER ?? 'sandbox',
        configured:
          (process.env.WEB_PAYMENT_PROVIDER ?? 'sandbox') === 'sandbox' ||
          Boolean(process.env.WEB_PAYMENT_API_URL && process.env.WEB_PAYMENT_API_KEY),
        storeVerifyConfigured: Boolean(process.env.STORE_VERIFY_URL && process.env.STORE_VERIFY_KEY),
        sandboxCompleteEnabled: process.env.PAYMENTS_DEV_COMPLETE === 'true',
        telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_PAYMENT_CHAT_ID),
      },
      drm: {
        configured: Boolean(process.env.LICENSE_SERVER_URL && process.env.LICENSE_SIGNING_SECRET),
        cdn: Boolean(process.env.CDN_PUBLIC_BASE && process.env.CDN_SIGNING_SECRET),
      },
      integrity: {
        secretConfigured: Boolean(process.env.APP_INTEGRITY_SECRET),
        required: process.env.APP_INTEGRITY_REQUIRED === 'true',
      },
    };
  }

  private async postgres() {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, ms: Date.now() - started };
    } catch {
      return { ok: false, ms: Date.now() - started };
    }
  }

  private async redis() {
    const started = Date.now();
    const raw = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
    try {
      const url = new URL(raw);
      const ok = await pingRedis(url.hostname, Number(url.port || 6379));
      return { ok, ms: Date.now() - started };
    } catch {
      return { ok: false, ms: Date.now() - started };
    }
  }

  private async storageOk() {
    const root = process.env.STORAGE_ROOT ?? './storage';
    try {
      await access(root, constants.R_OK);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
}

function pingRedis(host: string, port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = new Socket();
    const finish = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(1500);
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
    socket.connect(port, host, () => {
      socket.write('PING\r\n');
    });
    socket.once('data', (buf) => {
      finish(buf.toString().includes('PONG'));
    });
  });
}
