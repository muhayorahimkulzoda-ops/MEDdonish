import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { CurrentAdmin } from '../../common/current-admin';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import type { AdminPayload } from '../admin-auth/admin-jwt.strategy';
import { ClinicalService } from './clinical.service';
import { AnswerSimpleCaseDto, CreateClinicalCaseDto, CreateSimpleCaseDto, UpdateClinicalCaseDto } from './clinical.dto';

@ApiTags('admin-clinical')
@ApiBearerAuth()
@SkipThrottle()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class ClinicalAdminController {
  constructor(private readonly clinical: ClinicalService) {}

  @Get('clinical')
  list() {
    return this.clinical.list();
  }

  @Get('clinical/lessons')
  lessons() {
    return this.clinical.listLessons();
  }

  @Post('situational-tasks')
  createSimple(
    @CurrentAdmin() admin: AdminPayload,
    @Body() body: CreateSimpleCaseDto,
    @Req() req: Request,
  ) {
    return this.clinical.createSimple(admin.adminId, body, req.ip);
  }

  @Get('situational-tasks/:id')
  getSimple(@Param('id') id: string) {
    return this.clinical.getSimple(id, true);
  }

  @Post('situational-tasks/:id/answer')
  answerSimple(@Param('id') id: string, @Body() body: AnswerSimpleCaseDto) {
    return this.clinical.answerSimple(id, body);
  }

  @Post('clinical-cases')
  createCase(
    @CurrentAdmin() admin: AdminPayload,
    @Body() body: CreateClinicalCaseDto,
    @Req() req: Request,
  ) {
    return this.clinical.createCase(admin.adminId, body, req.ip);
  }

  @Get('clinical-cases/:id')
  getCase(@Param('id') id: string) {
    return this.clinical.getCase(id, true);
  }

  @Patch('clinical-cases/:id')
  updateCase(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Body() body: UpdateClinicalCaseDto,
    @Req() req: Request,
  ) {
    return this.clinical.updateCase(admin.adminId, id, body, req.ip);
  }

  @Post('clinical-cases/:id/media')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 12 * 1024 * 1024 },
    }),
  )
  uploadImage(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    @Body('caption') caption: string,
    @Req() req: Request,
  ) {
    return this.clinical.attachImage(admin.adminId, id, file, caption, req.ip);
  }

  @Post('clinical-media/:id/view-session')
  viewImage(@CurrentAdmin() admin: AdminPayload, @Param('id') id: string) {
    return this.clinical.viewImage(id, admin.adminId, undefined, true);
  }
}
