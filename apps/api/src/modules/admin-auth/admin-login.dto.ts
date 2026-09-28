import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsEmail({ require_tld: false })
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  totp?: string;
}
