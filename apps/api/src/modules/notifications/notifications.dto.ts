import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Platform } from '@prisma/client';

export class PushTokenDto {
  @IsEnum(Platform)
  platform: Platform;

  @IsString()
  @MinLength(8)
  @MaxLength(4096)
  token: string;
}

export class ToggleTemplateDto {
  @IsBoolean()
  enabled: boolean;
}

export class SystemNotificationDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(2000)
  body: string;
}

export class RemovePushTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  token?: string;
}
