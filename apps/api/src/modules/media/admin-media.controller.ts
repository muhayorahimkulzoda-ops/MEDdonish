import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { Request } from 'express';
import { CurrentAdmin } from '../../common/current-admin';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import type { AdminPayload } from '../admin-auth/admin-jwt.strategy';
import { DocumentService } from './document.service';
import { MediaLibraryService } from './media-library.service';
import { MediaSessionService } from './session.service';
import { VideoUploadService } from './video-upload.service';

class CreateVideoDto {
  @IsString()
  originalName: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  byteSize: number;
}

class ExternalVideoDto {
  @IsString()
  externalUrl: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSec?: number;

  @IsOptional()
  @IsString()
  language?: 'ru' | 'tg' | 'en';
}

@ApiTags('admin-media')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class AdminMediaController {
  constructor(
    private readonly videos: VideoUploadService,
    private readonly documents: DocumentService,
    private readonly sessions: MediaSessionService,
    private readonly library: MediaLibraryService,
  ) {}

  @Post('lessons/:lessonId/videos')
  createVideo(
    @CurrentAdmin() admin: AdminPayload,
    @Param('lessonId') lessonId: string,
    @Body() body: CreateVideoDto,
    @Req() req: Request,
  ) {
    return this.videos.create(admin.adminId, lessonId, body.originalName, body.byteSize, req.ip);
  }

  @Post('lessons/:lessonId/videos/external')
  attachExternal(
    @CurrentAdmin() admin: AdminPayload,
    @Param('lessonId') lessonId: string,
    @Body() body: ExternalVideoDto,
    @Req() req: Request,
  ) {
    return this.videos.attachExternal(admin.adminId, lessonId, body, req.ip);
  }

  @SkipThrottle()
  @Put('videos/:id/chunks')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('chunk', {
      storage: memoryStorage(),
      limits: { fileSize: 12 * 1024 * 1024 },
    }),
  )
  appendChunk(
    @Param('id') id: string,
    @UploadedFile() chunk: { buffer: Buffer } | undefined,
    @Body('offset') offset: string,
  ) {
    return this.videos.appendChunk(id, Number(offset), chunk?.buffer ?? Buffer.alloc(0));
  }

  @Post('videos/:id/complete')
  complete(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.videos.complete(admin.adminId, id, req.ip);
  }

  @Get('videos/:id')
  getVideo(@Param('id') id: string) {
    return this.videos.get(id);
  }

  @Delete('videos/:id')
  removeVideo(@CurrentAdmin() admin: AdminPayload, @Param('id') id: string, @Req() req: Request) {
    return this.videos.remove(admin.adminId, id, req.ip);
  }

  @Post('videos/:id/playback-session')
  playback(@CurrentAdmin() admin: AdminPayload, @Param('id') id: string) {
    return this.sessions.playback(id, admin.adminId);
  }

  @Post('lessons/:lessonId/documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 40 * 1024 * 1024 },
    }),
  )
  uploadPdf(
    @CurrentAdmin() admin: AdminPayload,
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    @Body('title') title: string,
    @Req() req: Request,
  ) {
    return this.documents.attachPdf(admin.adminId, lessonId, title, file, req.ip);
  }

  @Post('documents/:id/view-session')
  viewPdf(@CurrentAdmin() admin: AdminPayload, @Param('id') id: string) {
    return this.sessions.viewPdf(id, admin.adminId);
  }

  @Delete('documents/:id')
  removePdf(@CurrentAdmin() admin: AdminPayload, @Param('id') id: string, @Req() req: Request) {
    return this.documents.remove(admin.adminId, id, req.ip);
  }

  @Get('documents')
  listDocuments() {
    return this.documents.list();
  }

  @Get('media')
  listMedia(@Query('q') q?: string) {
    return this.library.list(q);
  }

  @Post('media')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 40 * 1024 * 1024 },
    }),
  )
  uploadMedia(
    @CurrentAdmin() admin: AdminPayload,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    @Body('title') title: string,
    @Req() req: Request,
  ) {
    return this.library.upload(admin.adminId, file, title, req.ip);
  }

  @Delete('media/:id')
  removeMedia(@CurrentAdmin() admin: AdminPayload, @Param('id') id: string, @Req() req: Request) {
    return this.library.remove(admin.adminId, id, req.ip);
  }
}
