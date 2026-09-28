import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Platform } from '@prisma/client';

export class DeviceDto {
  @IsString()
  @Length(8, 128)
  deviceId: string;

  @IsEnum(Platform)
  platform: Platform;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceModel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;
}

export class RequestOtpDto {
  @Matches(/^\+[1-9]\d{7,14}$/)
  phone: string;

  @IsOptional()
  @IsIn(['login', 'register', 'reset'])
  purpose?: 'login' | 'register' | 'reset';
}

export class VerifyOtpDto extends RequestOtpDto {
  @Matches(/^\d{6}$/)
  code: string;

  @ValidateNested()
  @Type(() => DeviceDto)
  device: DeviceDto;
}

export class LoginDto extends RequestOtpDto {
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  pin: string;

  @ValidateNested()
  @Type(() => DeviceDto)
  device: DeviceDto;
}

export class RefreshDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class SetPinDto {
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  pin: string;
}

export class SocialLoginDto {
  @IsIn(['google', 'apple'])
  provider: 'google' | 'apple';

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  idToken?: string;

  @ValidateNested()
  @Type(() => DeviceDto)
  device: DeviceDto;
}

export class RegisterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName: string;

  @IsString()
  @MaxLength(32)
  phone: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  passwordConfirm: string;

  @Matches(/^\d{6}$/)
  code: string;

  @ValidateNested()
  @Type(() => DeviceDto)
  device: DeviceDto;
}

export class ResetPasswordDto {
  @IsString()
  @MaxLength(32)
  phone: string;

  @Matches(/^\d{6}$/)
  code: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  passwordConfirm: string;

  @ValidateNested()
  @Type(() => DeviceDto)
  device: DeviceDto;
}

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  currentPassword?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  passwordConfirm: string;
}

export class PasswordLoginDto {
  @IsString()
  @MaxLength(32)
  phone: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;

  @ValidateNested()
  @Type(() => DeviceDto)
  device: DeviceDto;
}
