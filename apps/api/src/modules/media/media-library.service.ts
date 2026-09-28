import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { AppException } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../admin-cms/audit.service';
import { assertSafeUpload } from './file-policy';
import { StorageService } from './storage.service';

@Injectable()
export class MediaLibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  list(query?: string) {
    const q = query?.trim();
    return this.prisma.mediaAsset.findMany({
      where: q ? { title: { contains: q, mode: 'insensitive' } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    }).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        mimeType: row.mimeType,
        byteSize: Number(row.byteSize),
        kind: row.kind,
        createdAt: row.createdAt,
      })),
    );
  }

  async upload(
    adminId: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    title?: string,
    ip?: string,
  ) {
    try {
      assertSafeUpload(file.mimetype.startsWith('image/') ? 'image' : file.mimetype === 'application/pdf' ? 'pdf' : 'image', file);
    } catch (err) {
      throw new AppException((err as { code?: string }).code ?? 'FILE_TYPE', (err as Error).message);
    }
    const id = randomUUID();
    const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'bin';
    const storageKey = this.storage.mediaKey(id, ext);
    await this.storage.writeStream(storageKey, Readable.from(file.buffer));
    const kind = file.mimetype.startsWith('image/')
      ? 'image'
      : file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')
        ? 'pdf'
        : 'attachment';
    const asset = await this.prisma.mediaAsset.create({
      data: {
        id,
        storageKey,
        title: title || file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        byteSize: BigInt(file.size),
        kind,
        createdBy: adminId,
      },
    });
    await this.audit.log({ adminId, action: 'create', entity: 'media', entityId: asset.id, ip });
    return {
      id: asset.id,
      title: asset.title,
      mimeType: asset.mimeType,
      byteSize: Number(asset.byteSize),
      kind: asset.kind,
      createdAt: asset.createdAt,
    };
  }

  async remove(adminId: string, id: string, ip?: string) {
    await this.prisma.mediaAsset.delete({ where: { id } });
    await this.audit.log({ adminId, action: 'delete', entity: 'media', entityId: id, ip });
    return { ok: true };
  }
}
