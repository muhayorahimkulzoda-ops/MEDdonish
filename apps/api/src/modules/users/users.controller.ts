import { Body, Controller, Delete, Get, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Language } from '@prisma/client';
import { Equals, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AppException } from '../../common/errors';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { SubscriberPayload } from '../auth/jwt.strategy';
import { DevicesService } from '../devices/devices.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountDeletionService } from './account-deletion.service';
import { AccountExportService } from './account-export.service';

class PatchMeDto {
  @IsOptional()
  @IsEnum(Language)
  preferredLanguage?: Language;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName?: string;
}

class DeleteMeDto {
  @Equals('DELETE')
  confirm: 'DELETE';
}

class UpsertNoteDto {
  @IsString()
  @MaxLength(4000)
  content: string;
}

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devices: DevicesService,
    private readonly deletion: AccountDeletionService,
    private readonly exporter: AccountExportService,
  ) {}

  @Get()
  async me(@Req() req: Request & { user: SubscriberPayload }) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: req.user.userId },
      include: { profile: true },
    });
    return {
      id: user.id,
      phone: user.phone,
      status: user.status,
      preferredLanguage: user.preferredLanguage,
      firstName: user.profile?.firstName ?? '',
      lastName: user.profile?.lastName ?? '',
      displayName: user.profile?.displayName ?? '',
      hasPassword: Boolean(user.passwordHash),
      profile: user.profile,
    };
  }

  @Patch()
  async patchMe(
    @Req() req: Request & { user: SubscriberPayload },
    @Body() body: PatchMeDto,
  ) {
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();
    const displayName =
      body.displayName?.trim() ||
      (firstName || lastName ? [firstName, lastName].filter(Boolean).join(' ') : undefined);
    const user = await this.prisma.user.update({
      where: { id: req.user.userId },
      data: {
        preferredLanguage: body.preferredLanguage,
        profile:
          firstName || lastName || displayName
            ? {
                upsert: {
                  update: {
                    ...(firstName ? { firstName } : {}),
                    ...(lastName ? { lastName } : {}),
                    ...(displayName ? { displayName } : {}),
                  },
                  create: {
                    firstName: firstName ?? null,
                    lastName: lastName ?? null,
                    displayName: displayName ?? null,
                  },
                },
              }
            : undefined,
      },
      include: { profile: true },
    });
    return {
      id: user.id,
      phone: user.phone,
      status: user.status,
      preferredLanguage: user.preferredLanguage,
      firstName: user.profile?.firstName ?? '',
      lastName: user.profile?.lastName ?? '',
      displayName: user.profile?.displayName ?? '',
      hasPassword: Boolean(user.passwordHash),
      profile: user.profile,
    };
  }

  @Get('lessons/:lessonId/note')
  async myNote(
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    const note = await this.prisma.userNote.findFirst({
      where: { userId: req.user.userId, lessonId },
      orderBy: { updatedAt: 'desc' },
      select: { content: true, updatedAt: true },
    });
    return { content: note?.content ?? '', updatedAt: note?.updatedAt ?? null };
  }

  @Put('lessons/:lessonId/note')
  async saveNote(
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @Body() body: UpsertNoteDto,
    @Req() req: Request & { user: SubscriberPayload },
  ) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, status: 'published' },
      select: { id: true },
    });
    if (!lesson) throw new AppException('LESSON_NOT_FOUND', 'Lesson not found', HttpStatus.NOT_FOUND);
    const existing = await this.prisma.userNote.findFirst({
      where: { userId: req.user.userId, lessonId },
      orderBy: { updatedAt: 'desc' },
    });
    const note = existing
      ? await this.prisma.userNote.update({
          where: { id: existing.id },
          data: { content: body.content },
          select: { content: true, updatedAt: true },
        })
      : await this.prisma.userNote.create({
          data: { userId: req.user.userId, lessonId, content: body.content },
          select: { content: true, updatedAt: true },
        });
    return note;
  }

  @Get('attempts')
  attempts(@Req() req: Request & { user: SubscriberPayload }) {
    return this.prisma.testAttempt.findMany({
      where: { userId: req.user.userId, finishedAt: { not: null } },
      orderBy: { finishedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        score: true,
        grade: true,
        finishedAt: true,
        test: { select: { id: true, title: true, lessonId: true, courseId: true } },
      },
    });
  }

  @Get('device')
  async device(@Req() req: Request & { user: SubscriberPayload }) {
    return this.prisma.device.findFirstOrThrow({
      where: { id: req.user.deviceRecordId, userId: req.user.userId },
      select: {
        id: true,
        deviceId: true,
        platform: true,
        deviceModel: true,
        lastSeenAt: true,
        isActive: true,
      },
    });
  }

  @Delete('device')
  release(@Req() req: Request & { user: SubscriberPayload }) {
    return this.devices.release(req.user.userId);
  }

  @Get('export')
  exportMine(@Req() req: Request & { user: SubscriberPayload }) {
    return this.exporter.exportMine(req.user.userId);
  }

  @Post('delete')
  deleteAccount(
    @Req() req: Request & { user: SubscriberPayload },
    @Body() _body: DeleteMeDto,
  ) {
    return this.deletion.deleteAccount(req.user.userId);
  }
}
