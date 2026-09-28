import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  grade_5_min?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  grade_4_min?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  grade_3_min?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  pass_min?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  video_completed_percent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  free_preview_limit?: number;

  @IsOptional()
  @IsIn(['require_release', 'auto_revoke'])
  single_device_policy?: 'require_release' | 'auto_revoke';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  default_question_count?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  seconds_per_question?: number;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  @Matches(/^$|^https?:\/\/(t\.me|telegram\.me)\/.+/i)
  telegram_contact_url?: string;

  @IsOptional()
  @IsIn(['manual_telegram', 'web_payment'])
  commerce_channel?: 'manual_telegram' | 'web_payment';
}

export class TotpCodeDto {
  @IsString()
  @Matches(/^\d{6}$/)
  totp: string;
}
