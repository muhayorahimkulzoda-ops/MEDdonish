import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AccessSource,
  PaymentSource,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { AppException, Errors } from '../../common/errors';
import { hmacEquals, hmacHex, sha256 } from '../../common/crypto';
import { assertWebhookFresh, webhookSignedMessage } from '../../common/webhook-freshness';
import { PrismaService } from '../../prisma/prisma.service';
import { isYear3Slug } from '../catalog/offer';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { AttachStoreReceiptDto, CreateOrderDto, ProviderWebhookDto, WebReceiptDto } from './payments.dto';
import { canonicalWebhook } from './canonical';
import { StoreReceiptVerifier } from './providers/store-verifier';
import { TelegramReviewAdapter } from './providers/telegram-review';
import { WebPaymentProvider } from './providers/web-provider';

const PROVIDER_NAME: Record<PaymentSource, string> = {
  WEB_PAYMENT: 'web',
  GOOGLE_PLAY: 'google_play',
  APPLE_IAP: 'apple',
  ADMIN: 'admin',
};

const WEB_METHODS = ['dushanbe_city', 'alif', 'eskhata'] as const;
type WebMethod = (typeof WEB_METHODS)[number];

function isWebMethod(value?: string): value is WebMethod {
  return Boolean(value && (WEB_METHODS as readonly string[]).includes(value));
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly webProvider: WebPaymentProvider,
    private readonly storeVerifier: StoreReceiptVerifier,
    private readonly telegram: TelegramReviewAdapter,
  ) {}

  async createOrder(dto: CreateOrderDto, userId?: string) {
    if (dto.source === PaymentSource.ADMIN) {
      throw new AppException('PAYMENT_SOURCE_INVALID', 'Admin access is granted separately');
    }
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { code: dto.planCode } });
    const price = await this.prisma.coursePrice.findFirst({
      where: { courseId: dto.courseId, planId: plan.id },
    });
    if (!price) throw new AppException('PRICE_NOT_FOUND', 'Course price is not configured');

    const user = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : dto.phone
        ? await this.prisma.user.findUnique({ where: { phone: dto.phone } })
        : null;
    const phone = dto.phone || user?.phone;
    if (!phone) {
      throw new AppException('PHONE_REQUIRED', 'Phone is required');
    }

    const order = await this.prisma.order.create({
      data: {
        userId: user?.id,
        courseId: dto.courseId,
        planId: plan.id,
        phone,
        amountMinor: price.amountMinor,
        currency: price.currency,
        source: dto.source,
        status: PaymentStatus.created,
        payments: {
          create: {
            source: dto.source,
            status: PaymentStatus.pending,
            provider: PROVIDER_NAME[dto.source],
            amountMinor: price.amountMinor,
            currency: price.currency,
          },
        },
      },
      include: { payments: true, course: { include: { translations: true } }, plan: true },
    });
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: PaymentStatus.pending },
    });

    if (dto.source === PaymentSource.WEB_PAYMENT) {
      if (isWebMethod(dto.method)) {
        await this.prisma.paymentEvent.create({
          data: {
            paymentId: order.payments[0].id,
            eventKey: `checkout:${order.id}`,
            payload: {
              checkoutUrl: `${process.env.WEB_ORIGIN ?? 'http://localhost:3001'}/checkout/${order.id}`,
              method: dto.method,
            } as Prisma.InputJsonValue,
          },
        });
        return this.publicOrder(order.id);
      }
      const session = await this.webProvider.createSession({
        orderId: order.id,
        amountMinor: order.amountMinor,
        currency: order.currency,
      });
      if (session.providerPaymentId) {
        await this.prisma.payment.update({
          where: { id: order.payments[0].id },
          data: { providerPaymentId: session.providerPaymentId },
        });
      }
      await this.prisma.paymentEvent.create({
        data: {
          paymentId: order.payments[0].id,
          eventKey: `checkout:${order.id}`,
          payload: { checkoutUrl: session.checkoutUrl } as Prisma.InputJsonValue,
        },
      });
    }

    return this.publicOrder(order.id);
  }

  async submitWebReceipt(
    dto: WebReceiptDto,
    file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    const payer = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: {},
      create: {
        phone: dto.phone,
        phoneVerified: false,
        profile: { create: {} },
      },
    });
    if (payer.status !== 'active') throw Errors.userBlocked();
    const created = await this.createOrder(
      {
        phone: dto.phone,
        courseId: dto.courseId,
        planCode: dto.planCode,
        source: PaymentSource.WEB_PAYMENT,
        method: dto.method,
      },
      payer.id,
    );
    return this.submitReceipt(created.id, payer.id, undefined, file);
  }

  async attachStoreReceipt(orderId: string, userId: string, dto: AttachStoreReceiptDto) {
    if (dto.source !== PaymentSource.GOOGLE_PLAY && dto.source !== PaymentSource.APPLE_IAP) {
      throw new AppException('PAYMENT_SOURCE_INVALID', 'Only store sources accept a purchase token');
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order || order.userId !== userId) {
      throw new AppException('ORDER_NOT_FOUND', 'Order not found');
    }
    if (order.source !== dto.source) {
      throw new AppException('PAYMENT_SOURCE_INVALID', 'Provider does not match the order');
    }
    const payment = order.payments[0];
    if (!payment) {
      throw new AppException('ORDER_NOT_FOUND', 'Payment not found');
    }
    if (payment.status === PaymentStatus.paid) {
      return this.publicOrder(order.id);
    }
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: dto.purchaseToken },
    });

    const verdict = await this.storeVerifier.verify({
      source: dto.source,
      orderId: order.id,
      purchaseToken: dto.purchaseToken,
      amountMinor: order.amountMinor,
      currency: order.currency,
    });
    if (
      verdict.paid &&
      verdict.amountMinor === order.amountMinor &&
      verdict.currency === order.currency
    ) {
      const webhook: ProviderWebhookDto = {
        eventId: `store-verify-${order.id}-${sha256(dto.purchaseToken).slice(0, 16)}`,
        orderId: order.id,
        providerPaymentId: verdict.providerPaymentId ?? sha256(dto.purchaseToken).slice(0, 32),
        amountMinor: order.amountMinor,
        currency: order.currency,
        status: PaymentStatus.paid,
      };
      const raw = canonicalWebhook(webhook);
      const timestamp = String(Math.floor(Date.now() / 1000));
      return this.ingestWebhook(
        dto.source,
        raw,
        hmacHex(this.secretFor(dto.source), webhookSignedMessage(raw, timestamp)),
        webhook,
        timestamp,
      );
    }

    return this.publicOrder(order.id);
  }

  async getOrder(id: string) {
    return this.publicOrder(id);
  }

  async submitReceipt(
    orderId: string,
    userId: string,
    note?: string,
    file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order || order.userId !== userId) {
      throw new AppException('ORDER_NOT_FOUND', 'Order not found');
    }
    if (order.status === PaymentStatus.paid) {
      return this.publicOrder(order.id);
    }
    if (order.status === PaymentStatus.failed || order.status === PaymentStatus.cancelled) {
      throw new AppException('PAYMENT_ALREADY_SETTLED', 'Payment was already declined');
    }
    const checkout = await this.prisma.paymentEvent.findUnique({
      where: { eventKey: `checkout:${order.id}` },
    });
    const method = (checkout?.payload as { method?: string } | null)?.method ?? 'web';
    const payment = order.payments[0];
    if (!payment) throw new AppException('ORDER_NOT_FOUND', 'Payment not found');

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
    if (!file || !allowed.has(file.mimetype) || file.size > 5_000_000) {
      throw new AppException('RECEIPT_INVALID', 'Receipt must be a JPEG/PNG/WebP image up to 5 MB');
    }
    if (!this.telegram.configured()) {
      throw new AppException(
        'TELEGRAM_NOT_CONFIGURED',
        'Telegram bot is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const sent = await this.telegram.sendPaymentReview({
      orderId: order.id,
      method,
      phone: order.phone,
      amountMinor: order.amountMinor,
      currency: order.currency,
      note,
      photo: { buffer: file.buffer, filename: file.originalname || 'check.jpg', mime: file.mimetype },
    });
    if (!sent) {
      throw new AppException(
        'TELEGRAM_SEND_FAILED',
        'Could not send receipt to Telegram',
        HttpStatus.BAD_GATEWAY,
      );
    }
    await this.prisma.paymentEvent.upsert({
      where: { eventKey: `telegram:${order.id}` },
      update: {
        payload: {
          status: 'pending',
          method,
          note: note ?? null,
          telegramChatId: sent?.chatId ?? null,
          telegramMessageId: sent?.messageId ?? null,
        } as Prisma.InputJsonValue,
      },
      create: {
        paymentId: payment.id,
        eventKey: `telegram:${order.id}`,
        payload: {
          status: 'pending',
          method,
          note: note ?? null,
          telegramChatId: sent?.chatId ?? null,
          telegramMessageId: sent?.messageId ?? null,
        } as Prisma.InputJsonValue,
      },
    });
    return this.publicOrder(order.id);
  }

  async settleReview(orderId: string, approved: boolean, actor: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new AppException('ORDER_NOT_FOUND', 'Order not found');
    if (order.status === PaymentStatus.paid || order.status === PaymentStatus.failed) {
      return this.publicOrder(order.id);
    }
    const payment = order.payments[0];
    if (!payment) throw new AppException('ORDER_NOT_FOUND', 'Payment not found');
    const status = approved ? PaymentStatus.paid : PaymentStatus.failed;
    await this.prisma.paymentEvent.upsert({
      where: { eventKey: `${order.source}:review-${order.id}` },
      update: {},
      create: {
        paymentId: payment.id,
        eventKey: `${order.source}:review-${order.id}`,
        payload: { actor, status, approved } as Prisma.InputJsonValue,
      },
    });
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status },
    });
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status },
    });
    const review = await this.prisma.paymentEvent.findUnique({
      where: { eventKey: `telegram:${order.id}` },
    });
    const reviewPayload = (review?.payload as {
      telegramChatId?: number;
      telegramMessageId?: number;
      method?: string;
      note?: string;
    } | null) ?? {};
    if (review) {
      await this.prisma.paymentEvent.update({
        where: { id: review.id },
        data: {
          payload: {
            ...reviewPayload,
            status: approved ? 'approved' : 'rejected',
          } as Prisma.InputJsonValue,
        },
      });
    }
    if (approved) {
      await this.entitlements.activateFromPaidPayment(payment.id);
    }
    return this.publicOrder(order.id);
  }

  async handleTelegramUpdate(body: Record<string, unknown>, secretHeader?: string) {
    if (!this.telegram.verifyWebhookSecret(secretHeader)) {
      throw new AppException('WEBHOOK_SIGNATURE_INVALID', 'Webhook signature is invalid', HttpStatus.UNAUTHORIZED);
    }
    await this.telegram.bindAdminChatFromUpdate(body);
    return this.applyTelegramUpdate(body);
  }

  async handleTelegramPollUpdate(body: Record<string, unknown>) {
    return this.applyTelegramUpdate(body);
  }

  private async applyTelegramUpdate(body: Record<string, unknown>) {
    const callback = this.telegram.parseCallback(body);
    if (!callback) return { ok: true };
    const result = await this.settleReview(
      callback.orderId,
      callback.approved,
      'telegram',
    );
    if (callback.chatId && callback.messageId) {
      await this.telegram.markDecision(
        callback.chatId,
        callback.messageId,
        callback.approved,
        callback.callbackId,
      );
    }
    return result;
  }

  async ingestWebhook(
    source: PaymentSource,
    rawBody: string,
    signature: string | undefined,
    dto: ProviderWebhookDto,
    timestamp?: string,
  ) {
    assertWebhookFresh(timestamp);
    this.verifySignature(source, rawBody, signature, timestamp);
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payments: true },
    });
    if (!order) throw new AppException('ORDER_NOT_FOUND', 'Order not found');
    if (order.source !== source) {
      throw new AppException('PAYMENT_SOURCE_INVALID', 'Provider does not match the order');
    }
    if (order.amountMinor !== dto.amountMinor || order.currency !== dto.currency) {
      throw new AppException('PAYMENT_AMOUNT_MISMATCH', 'Amount or currency does not match the order');
    }

    const existingEvent = await this.prisma.paymentEvent.findUnique({
      where: { eventKey: `${source}:${dto.eventId}` },
    });
    if (existingEvent) {
      return this.publicOrder(order.id);
    }

    let payment = order.payments[0];
    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          source,
          status: PaymentStatus.pending,
          provider: PROVIDER_NAME[source],
          providerPaymentId: dto.providerPaymentId,
          amountMinor: dto.amountMinor,
          currency: dto.currency,
        },
      });
    } else {
      payment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { providerPaymentId: dto.providerPaymentId },
      });
    }

    await this.prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        eventKey: `${source}:${dto.eventId}`,
        payload: {
          eventId: dto.eventId,
          status: dto.status,
          providerPaymentId: dto.providerPaymentId,
        } as Prisma.InputJsonValue,
      },
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: dto.status },
    });
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: dto.status },
    });

    if (dto.status === PaymentStatus.paid) {
      await this.entitlements.activateFromPaidPayment(payment.id);
    }
    if (dto.status === PaymentStatus.refunded) {
      const sub = await this.prisma.subscription.findUnique({ where: { paymentId: payment.id } });
      if (sub) {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'cancelled' },
        });
        await this.entitlements.revokeFromRefundedPayment(sub.userId, sub.courseId);
      }
    }
    return this.publicOrder(order.id);
  }

  async devComplete(orderId: string) {
    if (process.env.PAYMENTS_DEV_COMPLETE !== 'true') {
      throw new AppException('DEV_PAYMENTS_DISABLED', 'Dev payment complete is disabled');
    }
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { payments: true },
    });
    const dto: ProviderWebhookDto = {
      eventId: `dev-${order.id}`,
      orderId: order.id,
      providerPaymentId: `dev-${order.payments[0]?.id ?? order.id}`,
      amountMinor: order.amountMinor,
      currency: order.currency,
      status: PaymentStatus.paid,
    };
    const raw = canonicalWebhook(dto);
    const secret = this.secretFor(order.source);
    const timestamp = String(Math.floor(Date.now() / 1000));
    return this.ingestWebhook(
      order.source,
      raw,
      hmacHex(secret, webhookSignedMessage(raw, timestamp)),
      dto,
      timestamp,
    );
  }

  listOrders() {
    return this.prisma.order.findMany({
      include: {
        course: { include: { translations: true } },
        plan: true,
        payments: true,
        user: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listEntitlements() {
    return this.prisma.entitlement.findMany({
      include: {
        user: { include: { profile: true } },
        course: { include: { translations: true } },
        plan: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  private verifySignature(
    source: PaymentSource,
    rawBody: string,
    signature: string | undefined,
    timestamp?: string,
  ) {
    const secret = this.secretFor(source);
    if (!signature || !hmacEquals(secret, webhookSignedMessage(rawBody, timestamp), signature)) {
      throw new AppException('WEBHOOK_SIGNATURE_INVALID', 'Webhook signature is invalid');
    }
  }

  private secretFor(source: PaymentSource) {
    if (source === PaymentSource.WEB_PAYMENT) {
      return process.env.WEB_PAYMENT_WEBHOOK_SECRET ?? 'dev-web-webhook';
    }
    if (source === PaymentSource.GOOGLE_PLAY) {
      return process.env.GOOGLE_PLAY_WEBHOOK_SECRET ?? 'dev-google-webhook';
    }
    if (source === PaymentSource.APPLE_IAP) {
      return process.env.APPLE_IAP_WEBHOOK_SECRET ?? 'dev-apple-webhook';
    }
    throw new AppException('PAYMENT_SOURCE_INVALID', 'No webhook adapter for this source');
  }

  private async publicOrder(id: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        course: { include: { translations: true } },
        plan: true,
        payments: true,
      },
    });
    const payment = order.payments[0];
    const entitlement = order.userId
      ? await this.prisma.entitlement.findFirst({
          where: {
            userId: order.userId,
            courseId: order.courseId,
            status: 'active',
            expiresAt: { gt: new Date() },
          },
        })
      : null;
    const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3001';
    const checkoutEvent = await this.prisma.paymentEvent.findUnique({
      where: { eventKey: `checkout:${order.id}` },
    });
    const checkoutPayload = checkoutEvent?.payload as { checkoutUrl?: string; method?: string } | null;
    const reviewEvent = await this.prisma.paymentEvent.findUnique({
      where: { eventKey: `telegram:${order.id}` },
    });
    const reviewPayload = reviewEvent?.payload as { status?: string } | null;
    const entitled = Boolean(entitlement);
    return {
      id: order.id,
      status: order.status,
      source: order.source,
      phone: order.phone,
      amountMinor: order.amountMinor,
      currency: order.currency,
      planCode: order.plan.code,
      method: checkoutPayload?.method ?? null,
      reviewStatus: reviewPayload?.status ?? null,
      course: {
        id: order.courseId,
        slug: order.course.slug,
        title: order.course.translations[0]?.title,
      },
      isYear3Bundle: isYear3Slug(order.course.slug),
      payment: payment
        ? { id: payment.id, status: payment.status, provider: payment.provider }
        : null,
      entitlementActive: entitled,
      grantsAccess: entitled,
      sandboxCompleteEnabled:
        process.env.PAYMENTS_DEV_COMPLETE === 'true' && order.source === PaymentSource.WEB_PAYMENT,
      checkoutUrl: checkoutPayload?.checkoutUrl ?? `${webOrigin}/checkout/${order.id}`,
    };
  }
}

export { canonicalWebhook } from './canonical';
