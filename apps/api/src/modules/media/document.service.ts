import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../admin-cms/audit.service';
import { StorageService } from './storage.service';
import { Readable } from 'node:stream';

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  serialize(document: { id: string; title: string; mimeType: string; byteSize: bigint }) {
    return {
      id: document.id,
      title: document.title,
      mimeType: document.mimeType,
      byteSize: Number(document.byteSize),
    };
  }

  async attachPdf(
    adminId: string,
    lessonId: string,
    title: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    ip?: string,
  ) {
    if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new AppException('PDF_REQUIRED', 'Only PDF notes are accepted');
    }
    await this.prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });
    const document = await this.prisma.document.create({
      data: {
        title: title || file.originalname,
        mimeType: 'application/pdf',
        byteSize: BigInt(file.size),
        storageKey: 'pending',
      },
    });
    const storageKey = this.storage.documentKey(document.id);
    await this.storage.writeStream(storageKey, Readable.from(file.buffer));
    const saved = await this.prisma.document.update({
      where: { id: document.id },
      data: { storageKey },
    });
    await this.prisma.lessonDocument.create({
      data: { lessonId, documentId: saved.id },
    });
    await this.audit.log({
      adminId,
      action: 'create',
      entity: 'document',
      entityId: saved.id,
      ip,
    });
    return this.serialize(saved);
  }

  async remove(adminId: string, documentId: string, ip?: string) {
    await this.prisma.lessonDocument.deleteMany({ where: { documentId } });
    await this.prisma.document.delete({ where: { id: documentId } });
    await this.audit.log({
      adminId,
      action: 'delete',
      entity: 'document',
      entityId: documentId,
      ip,
    });
    return { ok: true };
  }

  list() {
    return this.prisma.document.findMany({
      include: { lessons: { include: { lesson: { include: { translations: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }).then((rows) =>
      rows.map((document) => ({
        ...this.serialize(document),
        createdAt: document.createdAt,
        lessons: document.lessons.map((row) => ({
          lessonId: row.lessonId,
          title: row.lesson.translations[0]?.title,
        })),
      })),
    );
  }
}
