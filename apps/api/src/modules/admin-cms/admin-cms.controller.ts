import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentAdmin } from '../../common/current-admin';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import type { AdminPayload } from '../admin-auth/admin-jwt.strategy';
import { CatalogAdminService } from './catalog-admin.service';
import {
  CreateCourseDto,
  CreateDisciplineDto,
  CreateLessonDto,
  CreateSectionDto,
  ReplaceLessonTimecodesDto,
  ReorderIdsDto,
  UpdateCourseDto,
  UpdateDisciplineDto,
  UpdateLessonDto,
  UpdateSectionDto,
} from './cms.dto';

@ApiTags('admin-cms')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class AdminCmsController {
  private readonly cms: CatalogAdminService;

  constructor(@Inject(CatalogAdminService) cms: CatalogAdminService) {
    this.cms = cms;
  }

  @Get('me')
  me(@CurrentAdmin() admin: AdminPayload) {
    return admin;
  }

  @Get('dashboard')
  dashboard() {
    return this.cms.dashboard();
  }

  @Get('search')
  search(@Req() req: Request) {
    return this.cms.search(String(req.query.q ?? ''));
  }

  @Get('topics')
  listTopics() {
    return this.cms.listTopics();
  }

  @Get('videos')
  listVideos() {
    return this.cms.listVideos();
  }

  @Get('disciplines')
  listDisciplines() {
    return this.cms.listDisciplines();
  }

  @Post('disciplines')
  createDiscipline(
    @CurrentAdmin() admin: AdminPayload,
    @Body() body: CreateDisciplineDto,
    @Req() req: Request,
  ) {
    return this.cms.createDiscipline(admin.adminId, body, req.ip);
  }

  @Patch('disciplines/:id')
  updateDiscipline(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Body() body: UpdateDisciplineDto,
    @Req() req: Request,
  ) {
    return this.cms.updateDiscipline(admin.adminId, id, body, req.ip);
  }

  @Get('courses')
  listCourses() {
    return this.cms.listCourses();
  }

  @Post('courses')
  createCourse(
    @CurrentAdmin() admin: AdminPayload,
    @Body() body: CreateCourseDto,
    @Req() req: Request,
  ) {
    return this.cms.createCourse(admin.adminId, body, req.ip);
  }

  @Get('courses/:id')
  getCourse(@Param('id') id: string) {
    return this.cms.getCourse(id);
  }

  @Patch('courses/:id')
  updateCourse(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Body() body: UpdateCourseDto,
    @Req() req: Request,
  ) {
    return this.cms.updateCourse(admin.adminId, id, body, req.ip);
  }

  @Patch('courses/:id/archive')
  archiveCourse(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.cms.archiveCourse(admin.adminId, id, req.ip);
  }

  @Delete('courses/:id')
  deleteCourse(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.cms.deleteCourse(admin.adminId, id, req.ip);
  }

  @Put('courses/:courseId/sections/order')
  reorderSections(
    @CurrentAdmin() admin: AdminPayload,
    @Param('courseId') courseId: string,
    @Body() body: ReorderIdsDto,
    @Req() req: Request,
  ) {
    return this.cms.reorderSections(admin.adminId, courseId, body.ids, req.ip);
  }

  @Put('sections/:sectionId/lessons/order')
  reorderLessons(
    @CurrentAdmin() admin: AdminPayload,
    @Param('sectionId') sectionId: string,
    @Body() body: ReorderIdsDto,
    @Req() req: Request,
  ) {
    return this.cms.reorderLessons(admin.adminId, sectionId, body.ids, req.ip);
  }

  @Post('courses/:courseId/sections')
  createSection(
    @CurrentAdmin() admin: AdminPayload,
    @Param('courseId') courseId: string,
    @Body() body: CreateSectionDto,
    @Req() req: Request,
  ) {
    return this.cms.createSection(admin.adminId, courseId, body, req.ip);
  }

  @Patch('sections/:id')
  updateSection(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Body() body: UpdateSectionDto,
    @Req() req: Request,
  ) {
    return this.cms.updateSection(admin.adminId, id, body, req.ip);
  }

  @Post('sections/:sectionId/lessons')
  createLesson(
    @CurrentAdmin() admin: AdminPayload,
    @Param('sectionId') sectionId: string,
    @Body() body: CreateLessonDto,
    @Req() req: Request,
  ) {
    return this.cms.createLesson(admin.adminId, sectionId, body, req.ip);
  }

  @Patch('lessons/:id')
  updateLesson(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Body() body: UpdateLessonDto,
    @Req() req: Request,
  ) {
    return this.cms.updateLesson(admin.adminId, id, body, req.ip);
  }

  @Delete('lessons/:id')
  deleteLesson(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.cms.deleteLesson(admin.adminId, id, req.ip);
  }

  @Get('lessons/:id/timecodes')
  listTimecodes(@Param('id') id: string) {
    return this.cms.listTimecodes(id);
  }

  @Put('lessons/:id/timecodes')
  replaceTimecodes(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Body() body: ReplaceLessonTimecodesDto,
    @Req() req: Request,
  ) {
    return this.cms.replaceTimecodes(admin.adminId, id, body, req.ip);
  }
}
