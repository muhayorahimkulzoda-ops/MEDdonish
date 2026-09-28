import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { PublishStatus } from '@prisma/client';

export class SourceItemDto {
  @IsString()
  @MaxLength(400)
  source_title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  author?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1800)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  url?: string;
}

export class UpsertDrugDto {
  @IsString()
  @MaxLength(200)
  generic_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  brand_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  drug_class?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  mechanism?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  indications?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  contraindications?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  adverse_effects?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  dosage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  interactions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  pregnancy?: string;

  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reviewer_name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceItemDto)
  sources?: SourceItemDto[];
}

export class PatchDrugDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  generic_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  brand_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  drug_class?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  mechanism?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  indications?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  contraindications?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  adverse_effects?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  dosage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  interactions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  pregnancy?: string;

  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reviewer_name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceItemDto)
  sources?: SourceItemDto[];
}

export class ReplaceSourcesDto {
  @IsUUID()
  entityId: string;

  @IsString()
  entityType: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceItemDto)
  sources: SourceItemDto[];
}
