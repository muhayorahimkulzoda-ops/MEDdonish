import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsDeliveryStatus } from '@prisma/client';
import { AppException } from '../../common/errors';
import { maskPhone } from '../../common/crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async sendOtp(phone: string, code: string) {
    const provider = this.config.get('SMS_PROVIDER') ?? 'console';
    const delivery = await this.prisma.smsDelivery.create({
      data: {
        phoneMasked: maskPhone(phone),
        template: 'otp',
        provider,
        status: SmsDeliveryStatus.queued,
      },
    });

    try {
      if (provider === 'console') {
        this.logger.log(`SMS queued for ${maskPhone(phone)}`);
      } else if (provider === 'http') {
        await this.sendHttp(phone, code);
        this.logger.log(`SMS sent for ${maskPhone(phone)}`);
      } else {
        throw new AppException('SMS_NOT_CONFIGURED', 'Unknown SMS provider', 503);
      }
      await this.prisma.smsDelivery.update({
        where: { id: delivery.id },
        data: { status: SmsDeliveryStatus.sent },
      });
    } catch (error) {
      await this.prisma.smsDelivery.update({
        where: { id: delivery.id },
        data: {
          status: SmsDeliveryStatus.failed,
          errorCode: error instanceof AppException ? error.code : 'SMS_FAILED',
        },
      });
      throw error;
    }
  }

  private async sendHttp(phone: string, code: string) {
    const url = this.config.get<string>('SMS_API_URL');
    const key = this.config.get<string>('SMS_API_KEY');
    if (!url || !key) {
      throw new AppException('SMS_NOT_CONFIGURED', 'SMS provider is not configured', 503);
    }

    let lastError: AppException | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone, template: 'otp', code }),
          signal: AbortSignal.timeout(8_000),
        });
        if (response.ok) return;
        lastError = new AppException('SMS_FAILED', 'Could not send confirmation code', 503);
      } catch {
        lastError = new AppException('SMS_FAILED', 'Could not send confirmation code', 503);
      }
    }
    this.logger.warn(`SMS provider failed for ${maskPhone(phone)}`);
    throw lastError ?? new AppException('SMS_FAILED', 'Could not send confirmation code', 503);
  }
}
