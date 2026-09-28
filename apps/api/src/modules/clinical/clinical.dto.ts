import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PublishStatus } from '@prisma/client';

export class SimpleCaseQuestionDto {
  @IsString()
  @MaxLength(2000)
  prompt: string;

  @IsArray()
  @ArrayMinSize(2)
  @Allow()
  options: { id: string; text: string }[];

  @Allow()
  correct: string | string[];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  explanation?: string;
}

export class CreateSimpleCaseDto {
  @IsUUID()
  lessonId: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(8000)
  vignette: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SimpleCaseQuestionDto)
  questions: SimpleCaseQuestionDto[];
}

export class AnswerSimpleCaseDto {
  @IsArray()
  @Allow()
  selected: string[][];
}

export class ClinicalStepDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(8000)
  body: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateClinicalCaseDto {
  @IsUUID()
  lessonId: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  patientAge?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  patientSex?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  complaints?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  history?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  examination?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  laboratory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  instrumental?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  diagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  differential?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  discussion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  conclusion?: string;

  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  specialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  management?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reviewerName?: string;

  @IsOptional()
  @IsArray()
  @Allow()
  references?: unknown;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicalStepDto)
  steps?: ClinicalStepDto[];
}

export class UpdateClinicalCaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  patientAge?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  patientSex?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  complaints?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  history?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  examination?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  laboratory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  instrumental?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  diagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  differential?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  discussion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  conclusion?: string;

  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  specialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  management?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reviewerName?: string;

  @IsOptional()
  @IsArray()
  @Allow()
  references?: unknown;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicalStepDto)
  steps?: ClinicalStepDto[];
}
