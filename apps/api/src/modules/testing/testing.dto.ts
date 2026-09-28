import { Allow, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Language, TestMode } from '@prisma/client';

export class ImportQuestionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @Allow()
  questions: unknown[];

  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @IsOptional()
  @IsUUID()
  disciplineId?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsUUID()
  lessonId?: string;
}

export class AttachLessonTestDto {
  @IsArray()
  @ArrayMinSize(1)
  @Allow()
  questions: unknown[];

  @IsOptional()
  @IsString()
  title?: string;
}

export class ReplaceLessonTestDto {
  @IsArray()
  @Allow()
  questions: unknown[];

  @IsOptional()
  @IsString()
  title?: string;
}

export class CreateTestDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  disciplineId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  questionCount?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  timePerQuestion?: number;

  @IsOptional()
  @IsEnum(TestMode)
  mode?: TestMode;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  questionIds?: string[];
}

export class AnswerAttemptDto {
  @IsArray()
  @IsString({ each: true })
  selectedCodes: string[];

  @IsOptional()
  @IsBoolean()
  timedOut?: boolean;
}
