import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ContentAccessType, ContentType, PublishStatus } from '@prisma/client';
import { memoryStorage } from 'multer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { Request } from 'express';
import { CurrentAdmin } from '../../common/current-admin';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import type { AdminPayload } from '../admin-auth/admin-jwt.strategy';
import { MaterialsService } from './materials.service';

class CreateMaterialDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsUUID()
  lessonId: string;

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsEnum(ContentAccessType)
  accessType: ContentAccessType;

  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  previewPagesCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  demoQuestionsCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  previewDurationSec?: number;

  @IsOptional()
  @IsString()
  originalName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  byteSize?: number;
}

class PatchMaterialDto {
  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;

  @IsOptional()
  @IsEnum(ContentAccessType)
  accessType?: ContentAccessType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

@ApiTags('admin-materials')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/materials')
export class MaterialsAdminController {
  private readonly materials: MaterialsService;

  constructor(@Inject(MaterialsService) materials: MaterialsService) {
    this.materials = materials;
  }

  @Get()
  list(
    @Query('type') type?: string,
    @Query('access') access?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.materials.list({ type, access, status, q });
  }

  @Get('lessons')
  lessons() {
    return this.materials.lessons();
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 40 * 1024 * 1024 } }))
  create(
    @CurrentAdmin() admin: AdminPayload,
    @Body() body: CreateMaterialDto,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string } | undefined,
    @Req() req: Request,
  ) {
    return this.materials.create(admin.adminId, body, file, req.ip);
  }

  @Post(':id/preview')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 80 * 1024 * 1024 } }))
  preview(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    @Req() req: Request,
  ) {
    return this.materials.attachPreview(admin.adminId, id, file, req.ip);
  }

  @Post(':id/thumbnail')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } }))
  thumb(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    @Req() req: Request,
  ) {
    return this.materials.attachThumb(admin.adminId, id, file, req.ip);
  }

  @Patch(':id')
  patch(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Body() body: PatchMaterialDto,
    @Req() req: Request,
  ) {
    return this.materials.patch(admin.adminId, id, body, req.ip);
  }
}
