import { Injectable } from '@nestjs/common';
import { PublishStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from './audit.service';
import { PatchDrugDto, SourceItemDto, UpsertDrugDto } from './drugs.dto';

const DISCLAIMER =
  'Educational information only. Not an individual medical recommendation.';

@Injectable()
export class DrugsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.drug.findMany({ orderBy: { updatedAt: 'desc' } }).then((rows) =>
      rows.map((row) => this.serialize(row)),
    );
  }

  async get(id: string) {
    const drug = await this.prisma.drug.findUniqueOrThrow({ where: { id } });
    const sources = await this.prisma.contentSource.findMany({
      where: { entityType: 'drug', entityId: id },
      orderBy: { createdAt: 'asc' },
    });
    return { ...this.serialize(drug), sources };
  }

  async create(adminId: string, dto: UpsertDrugDto, ip?: string) {
    const drug = await this.prisma.drug.create({
      data: {
        genericName: dto.generic_name,
        brandName: dto.brand_name,
        drugClass: dto.drug_class,
        mechanism: dto.mechanism,
        indications: dto.indications,
        contraindications: dto.contraindications,
        adverseEffects: dto.adverse_effects,
        dosage: dto.dosage,
        interactions: dto.interactions,
        pregnancy: dto.pregnancy,
        status: dto.status ?? PublishStatus.draft,
        reviewerName: dto.reviewer_name,
        lastReviewedAt: dto.reviewer_name ? new Date() : null,
        publishedAt: dto.status === PublishStatus.published ? new Date() : null,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });
    if (dto.sources?.length) await this.replaceSources('drug', drug.id, dto.sources);
    await this.audit.log({ adminId, action: 'create', entity: 'drug', entityId: drug.id, ip });
    return this.get(drug.id);
  }

  async update(adminId: string, id: string, dto: PatchDrugDto, ip?: string) {
    await this.prisma.drug.update({
      where: { id },
      data: {
        genericName: dto.generic_name,
        brandName: dto.brand_name,
        drugClass: dto.drug_class,
        mechanism: dto.mechanism,
        indications: dto.indications,
        contraindications: dto.contraindications,
        adverseEffects: dto.adverse_effects,
        dosage: dto.dosage,
        interactions: dto.interactions,
        pregnancy: dto.pregnancy,
        status: dto.status,
        reviewerName: dto.reviewer_name,
        lastReviewedAt: dto.reviewer_name ? new Date() : undefined,
        publishedAt: dto.status === PublishStatus.published ? new Date() : undefined,
        updatedBy: adminId,
      },
    });
    if (dto.sources) await this.replaceSources('drug', id, dto.sources);
    await this.audit.log({ adminId, action: 'update', entity: 'drug', entityId: id, ip });
    return this.get(id);
  }

  async remove(adminId: string, id: string, ip?: string) {
    await this.prisma.contentSource.deleteMany({ where: { entityType: 'drug', entityId: id } });
    await this.prisma.drug.delete({ where: { id } });
    await this.audit.log({ adminId, action: 'delete', entity: 'drug', entityId: id, ip });
    return { id, deleted: true };
  }

  async replaceSources(entityType: string, entityId: string, sources: SourceItemDto[]) {
    await this.prisma.contentSource.deleteMany({ where: { entityType, entityId } });
    if (!sources.length) return [];
    await this.prisma.contentSource.createMany({
      data: sources.map((source) => ({
        entityType,
        entityId,
        sourceTitle: source.source_title,
        author: source.author,
        year: source.year,
        url: source.url,
      })),
    });
    return this.prisma.contentSource.findMany({ where: { entityType, entityId } });
  }

  private serialize(row: {
    id: string;
    genericName: string;
    brandName: string | null;
    drugClass: string | null;
    mechanism: string | null;
    indications: string | null;
    contraindications: string | null;
    adverseEffects: string | null;
    dosage: string | null;
    interactions: string | null;
    pregnancy: string | null;
    status: PublishStatus;
    lastReviewedAt: Date | null;
    reviewerName: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      generic_name: row.genericName,
      brand_name: row.brandName,
      drug_class: row.drugClass,
      mechanism: row.mechanism,
      indications: row.indications,
      contraindications: row.contraindications,
      adverse_effects: row.adverseEffects,
      dosage: row.dosage,
      interactions: row.interactions,
      pregnancy: row.pregnancy,
      status: row.status,
      last_reviewed_at: row.lastReviewedAt,
      reviewer_name: row.reviewerName,
      published_at: row.publishedAt,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      disclaimer: DISCLAIMER,
    };
  }
}
