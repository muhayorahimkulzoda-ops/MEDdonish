import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { CurrentAdmin } from '../../common/current-admin';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import type { AdminPayload } from '../admin-auth/admin-jwt.strategy';
import { UsersAdminService } from './users-admin.service';

class PatchUserDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}

class PatchUserProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsString()
  appRole?: string;
}

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/users')
export class UsersAdminController {
  constructor(private readonly users: UsersAdminService) {}

  @Get()
  list(@Query('q') q?: string, @Query('take') take?: string) {
    return this.users.list(q, take ? Number(take) : 2000);
  }

  @Get('staff')
  staff() {
    return this.users.listStaff();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.users.get(id);
  }

  @Patch(':id')
  patch(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Body() body: PatchUserDto,
    @Req() req: Request,
  ) {
    return this.users.setStatus(admin.adminId, id, body.status, req.ip);
  }

  @Patch(':id/profile')
  patchProfile(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Body() body: PatchUserProfileDto,
    @Req() req: Request,
  ) {
    return this.users.updateProfile(admin.adminId, id, body, req.ip);
  }

  @Post(':id/release-device')
  release(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.users.releaseDevice(admin.adminId, id, req.ip);
  }

  @Delete(':id')
  remove(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.users.remove(admin.adminId, id, req.ip);
  }
}
