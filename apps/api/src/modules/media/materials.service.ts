import { Inject, Injectable } from '@nestjs/common';
import {
  ContentAccessType,
  ContentType,
  DocumentKind,
  PublishStatus,
  VideoStatus,
} from '@prisma/client';
import { Readable } from 'node:stream';
import { AppException } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../admin-cms/audit.service';
import { assertSafeUpload, bucketFor } from './file-policy';
import { StorageService } from './storage.service';
import { VideoUploadService } from './video-upload.service';

@Injectable()
export class MaterialsService {
  private readonly prisma: PrismaService;
  private readonly storage: StorageService;
  private readonly videos: VideoUploadService;
  private readonly audit: AuditService;

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(StorageService) storage: StorageService,
    @Inject(VideoUploadService) videos: VideoUploadService,
    @Inject(AuditService) audit: AuditService,
  ) {
    this.prisma = prisma;
    this.storage = storage;
    this.videos = videos;
    this.audit = audit;
  }

  async list(filters: {
    type?: string;
    access?: string;
    status?: string;
    q?: string;
  }) {
    return this.prisma.contentItem.findMany({
      where: {
        contentType: filters.type && filters.type !== 'all' ? (filters.type as ContentType) : undefined,
        accessType: filters.access === 'free' || filters.access === 'paid' || filters.access === 'subscription'
          ? (filters.access as ContentAccessType)
          : undefined,
        status: filters.status === 'draft' || filters.status === 'published'
          ? (filters.status as PublishStatus)
          : undefined,
        title: filters.q?.trim() ? { contains: filters.q.trim(), mode: 'insensitive' } : undefined,
      },
      include: {
        course: { include: { translations: true } },
        lesson: { include: { translations: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 400,
    });
  }

  async lessons() {
    const rows = await this.prisma.lesson.findMany({
      where: { status: { not: 'archived' } },
      include: {
        translations: true,
        section: { include: { course: { include: { translations: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    return rows.map((lesson) => ({
      id: lesson.id,
      courseId: lesson.section.courseId,
      sectionId: lesson.sectionId,
      title: lesson.translations.find((row) => row.language === 'tg')?.title ?? lesson.translations[0]?.title ?? lesson.id,
      courseTitle:
        lesson.section.course.translations.find((row) => row.language === 'tg')?.title
        ?? lesson.section.course.translations[0]?.title
        ?? lesson.section.course.slug,
    }));
  }

  async create(adminId: string, input: {
    title: string;
    lessonId: string;
    contentType: ContentType;
    accessType: ContentAccessType;
    status?: PublishStatus;
    previewPagesCount?: number;
    demoQuestionsCount?: number;
    previewDurationSec?: number;
    originalName?: string;
    byteSize?: number;
  }, file: { buffer: Buffer; mimetype: string; size: number; originalname: string } | undefined, ip?: string) {
    const lesson = await this.prisma.lesson.findUniqueOrThrow({
      where: { id: input.lessonId },
      include: { section: true },
    });
    if (input.contentType === ContentType.video) {
      if (!input.originalName || !input.byteSize) {
        throw new AppException('VIDEO_TYPE', 'Video size and name are required');
      }
      assertSafeUpload('video', {
        originalname: input.originalName,
        mimetype: 'video/mp4',
        size: input.byteSize,
      });
      const video = await this.videos.create(adminId, lesson.id, input.originalName, input.byteSize, ip);
      await this.prisma.video.update({
        where: { id: video.id },
        data: { accessType: input.accessType, title: input.title },
      });
      const item = await this.prisma.contentItem.create({
        data: {
          title: input.title,
          contentType: ContentType.video,
          accessType: input.accessType,
          courseId: lesson.section.courseId,
          sectionId: lesson.sectionId,
          lessonId: lesson.id,
          entityId: video.id,
          storageBucket: bucketFor(input.accessType, 'video'),
          previewDurationSec: input.previewDurationSec,
          status: input.status ?? PublishStatus.draft,
        },
      });
      return { ...item, upload: video };
    }

    if (input.contentType === ContentType.test) {
      const test = await this.prisma.test.create({
        data: {
          title: input.title,
          lessonId: lesson.id,
          courseId: lesson.section.courseId,
          accessType: input.accessType,
          demoQuestionCount: input.demoQuestionsCount ?? 0,
          isActive: (input.status ?? PublishStatus.draft) === PublishStatus.published,
        },
      });
      const item = await this.prisma.contentItem.create({
        data: {
          title: input.title,
          contentType: ContentType.test,
          accessType: input.accessType,
          courseId: lesson.section.courseId,
          sectionId: lesson.sectionId,
          lessonId: lesson.id,
          entityId: test.id,
          storageBucket: 'premium-media',
          demoQuestionsCount: input.demoQuestionsCount ?? 0,
          status: input.status ?? PublishStatus.draft,
        },
      });
      await this.audit.log({ adminId, action: 'create', entity: 'test', entityId: test.id, ip });
      return item;
    }

    if (!file) throw new AppException('PDF_REQUIRED', 'File is required');
    const kind = input.contentType === ContentType.presentation ? 'presentation' : 'pdf';
    try {
      assertSafeUpload(kind, file);
    } catch (err) {
      throw new AppException((err as { code?: string }).code ?? 'FILE_TYPE', (err as Error).message);
    }
    const document = await this.prisma.document.create({
      data: {
        title: input.title || file.originalname,
        mimeType: 'application/pdf',
        byteSize: BigInt(file.size),
        storageKey: 'pending',
        kind: kind === 'presentation' ? DocumentKind.presentation : DocumentKind.pdf,
        accessType: input.accessType,
        previewPagesCount: input.previewPagesCount,
      },
    });
    const storageKey = this.storage.documentKey(document.id);
    await this.storage.writeStream(storageKey, Readable.from(file.buffer));
    const saved = await this.prisma.document.update({
      where: { id: document.id },
      data: { storageKey },
    });
    await this.prisma.lessonDocument.create({ data: { lessonId: lesson.id, documentId: saved.id } });
    const item = await this.prisma.contentItem.create({
      data: {
        title: saved.title,
        contentType: input.contentType,
        accessType: input.accessType,
        courseId: lesson.section.courseId,
        sectionId: lesson.sectionId,
        lessonId: lesson.id,
        entityId: saved.id,
        storageBucket: bucketFor(input.accessType, kind),
        storagePath: storageKey,
        previewPagesCount: input.previewPagesCount,
        status: input.status ?? PublishStatus.draft,
      },
    });
    await this.audit.log({ adminId, action: 'create', entity: 'document', entityId: saved.id, ip });
    return item;
  }

  async attachPreview(adminId: string, id: string, file: { buffer: Buffer; mimetype: string; size: number; originalname: string }, ip?: string) {
    const item = await this.prisma.contentItem.findUniqueOrThrow({ where: { id } });
    try {
      assertSafeUpload(item.contentType === ContentType.video ? 'preview' : 'pdf', file);
    } catch (err) {
      throw new AppException((err as { code?: string }).code ?? 'FILE_TYPE', (err as Error).message);
    }
    const key = this.storage.previewKey(item.entityId, file.originalname.replace(/[^\w.-]+/g, '_'));
    await this.storage.writeBuffer(key, file.buffer);
    const updated = await this.prisma.contentItem.update({
      where: { id },
      data: { previewStoragePath: key },
    });
    if (item.contentType === ContentType.video) {
      await this.prisma.video.update({
        where: { id: item.entityId },
        data: { previewSourceKey: key },
      });
    }
    await this.audit.log({ adminId, action: 'update', entity: 'content_item', entityId: id, ip });
    return updated;
  }

  async attachThumb(adminId: string, id: string, file: { buffer: Buffer; mimetype: string; size: number; originalname: string }, ip?: string) {
    try {
      assertSafeUpload('image', file);
    } catch (err) {
      throw new AppException((err as { code?: string }).code ?? 'FILE_TYPE', (err as Error).message);
    }
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = this.storage.thumbnailKey(id, ext);
    await this.storage.writeBuffer(key, file.buffer);
    const updated = await this.prisma.contentItem.update({
      where: { id },
      data: { thumbnailPath: key },
    });
    await this.audit.log({ adminId, action: 'update', entity: 'content_item', entityId: id, ip });
    return updated;
  }

  async patch(adminId: string, id: string, body: { status?: PublishStatus; accessType?: ContentAccessType; title?: string }, ip?: string) {
    const updated = await this.prisma.contentItem.update({ where: { id }, data: body });
    await this.audit.log({ adminId, action: 'update', entity: 'content_item', entityId: id, ip });
    return updated;
  }

  async markVideoStored(videoId: string, sourceKey: string) {
    await this.prisma.contentItem.updateMany({
      where: { entityId: videoId, contentType: ContentType.video },
      data: { storagePath: sourceKey, storageBucket: 'premium-media' },
    });
  }
}
