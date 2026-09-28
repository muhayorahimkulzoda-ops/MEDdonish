import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentAdmin } from '../../common/current-admin';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import type { AdminPayload } from '../admin-auth/admin-jwt.strategy';
import { PatchDrugDto, ReplaceSourcesDto, UpsertDrugDto } from './drugs.dto';
import { DrugsAdminService } from './drugs.service';

@ApiTags('admin-drugs')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin')
export class DrugsAdminController {
  constructor(private readonly drugs: DrugsAdminService) {}

  @Get('drugs')
  list() {
    return this.drugs.list();
  }

  @Post('drugs')
  create(@CurrentAdmin() admin: AdminPayload, @Body() body: UpsertDrugDto, @Req() req: Request) {
    return this.drugs.create(admin.adminId, body, req.ip);
  }

  @Get('drugs/:id')
  get(@Param('id') id: string) {
    return this.drugs.get(id);
  }

  @Patch('drugs/:id')
  update(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Body() body: PatchDrugDto,
    @Req() req: Request,
  ) {
    return this.drugs.update(admin.adminId, id, body, req.ip);
  }

  @Delete('drugs/:id')
  remove(@CurrentAdmin() admin: AdminPayload, @Param('id') id: string, @Req() req: Request) {
    return this.drugs.remove(admin.adminId, id, req.ip);
  }

  @Put('content-sources')
  sources(@Body() body: ReplaceSourcesDto) {
    return this.drugs.replaceSources(body.entityType, body.entityId, body.sources);
  }
}
