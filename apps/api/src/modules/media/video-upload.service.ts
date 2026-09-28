import { Injectable } from '@nestjs/common';
import { Language, VideoStatus } from '@prisma/client';
import { AppException } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../admin-cms/audit.service';
import { StorageService } from './storage.service';

const DEFAULT_CHUNK = 8 * 1024 * 1024;

@Injectable()
export class VideoUploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  chunkSize() {
    return Number(process.env.VIDEO_CHUNK_SIZE ?? DEFAULT_CHUNK);
  }

  serialize(video: {
    id: string;
    lessonId: string;
    status: VideoStatus;
    originalName: string | null;
    title?: string | null;
    externalUrl?: string | null;
    thumbnailUrl?: string | null;
    language?: string | null;
    byteSize: bigint;
    uploadedBytes: bigint;
    durationSec: number | null;
    errorMessage: string | null;
    variants?: { quality: string; protocol: string }[];
  }) {
    return {
      id: video.id,
      lessonId: video.lessonId,
      status: video.status,
      originalName: video.originalName,
      title: video.title ?? video.originalName,
      externalUrl: video.externalUrl ?? null,
      thumbnailUrl: video.thumbnailUrl ?? null,
      language: video.language ?? null,
      byteSize: Number(video.byteSize),
      uploadedBytes: Number(video.uploadedBytes),
      durationSec: video.durationSec,
      errorMessage: video.errorMessage,
      chunkSize: this.chunkSize(),
      variants: (video.variants ?? []).map((variant) => ({
        quality: variant.quality,
        protocol: variant.protocol,
      })),
    };
  }

  async create(adminId: string, lessonId: string, originalName: string, byteSize: number, ip?: string) {
    if (!/\.(mp4|webm|mov|m4v)$/i.test(originalName)) {
      throw new AppException('VIDEO_TYPE', 'Only MP4, WebM and MOV are allowed');
    }
    await this.prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    const video = await this.prisma.video.create({
      data: {
        lessonId,
        status: VideoStatus.UPLOADING,
        originalName,
        byteSize: BigInt(byteSize),
        uploadedBytes: 0n,
      },
    });
    await this.audit.log({
      adminId,
      action: 'create',
      entity: 'video',
      entityId: video.id,
      ip,
    });
    return this.serialize(video);
  }

  async appendChunk(videoId: string, offset: number, chunk: Buffer) {
    const video = await this.prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    if (video.status !== VideoStatus.UPLOADING) {
      throw new AppException('UPLOAD_CLOSED', 'Video is no longer accepting chunks');
    }
    if (offset !== Number(video.uploadedBytes)) {
      throw new AppException('UPLOAD_OFFSET', `Expected offset ${video.uploadedBytes}`);
    }
    const next = offset + chunk.length;
    if (next > Number(video.byteSize)) {
      throw new AppException('UPLOAD_OVERFLOW', 'Chunk exceeds declared file size');
    }
    await this.storage.appendChunk(this.storage.tempKey(videoId), offset, chunk);
    const updated = await this.prisma.video.update({
      where: { id: videoId },
      data: { uploadedBytes: BigInt(next) },
    });
    return this.serialize(updated);
  }

  async complete(adminId: string, videoId: string, ip?: string) {
    const video = await this.prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    if (Number(video.uploadedBytes) !== Number(video.byteSize)) {
      throw new AppException('UPLOAD_INCOMPLETE', 'Uploaded size does not match declared size');
    }
    const sourceKey = this.storage.sourceKey(videoId);
    await this.storage.move(this.storage.tempKey(videoId), sourceKey);
    const updated = await this.prisma.video.update({
      where: { id: videoId },
      data: {
        sourceKey,
        status: VideoStatus.PROCESSING,
        errorMessage: null,
      },
    });
    await this.prisma.contentItem.updateMany({
      where: { entityId: videoId, contentType: 'video' },
      data: { storagePath: sourceKey, storageBucket: 'premium-media' },
    });
    await this.prisma.videoVariant.deleteMany({ where: { videoId } });
    await this.prisma.videoVariant.create({
      data: {
        videoId,
        quality: 'source',
        protocol: 'signed-mp4',
        manifestKey: sourceKey,
      },
    });
    await this.prisma.videoJob.create({ data: { videoId, status: 'pending' } });
    await this.audit.log({
      adminId,
      action: 'complete_upload',
      entity: 'video',
      entityId: videoId,
      ip,
    });
    return this.serialize(updated);
  }

  async remove(adminId: string, videoId: string, ip?: string) {
    await this.prisma.video.delete({ where: { id: videoId } });
    await this.audit.log({
      adminId,
      action: 'delete',
      entity: 'video',
      entityId: videoId,
      ip,
    });
    return { ok: true };
  }

  async attachExternal(
    adminId: string,
    lessonId: string,
    input: {
      title?: string;
      externalUrl: string;
      thumbnailUrl?: string;
      durationSec?: number;
      language?: 'ru' | 'tg' | 'en';
    },
    ip?: string,
  ) {
    await this.prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    const video = await this.prisma.video.create({
      data: {
        lessonId,
        status: VideoStatus.READY,
        title: input.title,
        externalUrl: input.externalUrl,
        thumbnailUrl: input.thumbnailUrl,
        durationSec: input.durationSec,
        language: input.language as Language | undefined,
        originalName: input.title ?? 'external',
      },
      include: { variants: true },
    });
    await this.audit.log({
      adminId,
      action: 'create',
      entity: 'video_external',
      entityId: video.id,
      ip,
    });
    return this.serialize(video);
  }

  get(videoId: string) {
    return this.prisma.video.findUniqueOrThrow({
      where: { id: videoId },
      include: { variants: true },
    }).then((video) => this.serialize(video));
  }
}
