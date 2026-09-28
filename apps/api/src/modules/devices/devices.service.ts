import { Injectable } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { Errors } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

export interface DevicePayload {
  deviceId: string;
  platform: Platform;
  deviceModel?: string;
  appVersion?: string;
  ip?: string;
}

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async attach(userId: string, payload: DevicePayload) {
    const existing = await this.prisma.device.findFirst({
      where: { userId, isActive: true },
    });

    if (
      existing &&
      existing.deviceId === payload.deviceId &&
      existing.lastIp &&
      payload.ip &&
      existing.lastIp !== payload.ip
    ) {
      await this.prisma.securityEvent.create({
        data: {
          userId,
          type: 'ip_change',
          payload: { from: existing.lastIp, to: payload.ip },
          ip: payload.ip,
        },
      });
    }

    if (existing && existing.deviceId !== payload.deviceId) {
      const policy = await this.settings.getDevicePolicy();
      if (policy === 'require_release') {
        await this.prisma.securityEvent.create({
          data: {
            userId,
            type: 'device_conflict',
            payload: { current: existing.deviceId, incoming: payload.deviceId },
            ip: payload.ip,
          },
        });
        throw Errors.deviceConflict();
      }

      await this.prisma.$transaction([
        this.prisma.device.update({
          where: { id: existing.id },
          data: { isActive: false },
        }),
        this.prisma.refreshToken.updateMany({
          where: { deviceId: existing.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        this.prisma.session.updateMany({
          where: { deviceId: existing.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);
    }

    return this.prisma.device.upsert({
      where: {
        userId_deviceId: { userId, deviceId: payload.deviceId },
      },
      update: {
        isActive: true,
        platform: payload.platform,
        deviceModel: payload.deviceModel,
        appVersion: payload.appVersion,
        lastIp: payload.ip,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        deviceId: payload.deviceId,
        platform: payload.platform,
        deviceModel: payload.deviceModel,
        appVersion: payload.appVersion,
        lastIp: payload.ip,
        isActive: true,
      },
    });
  }

  async assertActive(userId: string, deviceRecordId: string) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceRecordId, userId, isActive: true },
    });
    if (!device) throw Errors.deviceInvalid();
    await this.prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });
    return device;
  }

  async release(userId: string) {
    const active = await this.prisma.device.findMany({
      where: { userId, isActive: true },
    });
    if (active.length === 0) return;
    await this.prisma.$transaction([
      this.prisma.device.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}
