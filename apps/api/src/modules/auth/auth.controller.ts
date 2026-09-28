import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { verifyAppIntegrity } from '../../common/app-integrity';
import { AuthService } from './auth.service';
import { clearAuthCookies, REFRESH_COOKIE, readCookie, setAuthCookies } from './cookies';
import {
  ChangePasswordDto,
  LoginDto,
  PasswordLoginDto,
  RefreshDto,
  RegisterDto,
  RequestOtpDto,
  ResetPasswordDto,
  SetPinDto,
  VerifyOtpDto,
} from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { SubscriberPayload } from './jwt.strategy';

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('request-otp')
  requestOtp(@Body() body: RequestOtpDto) {
    return this.auth.requestOtp(body.phone, body.purpose ?? 'login');
  }

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('verify-otp')
  async verifyOtp(
    @Body() body: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    verifyAppIntegrity(
      headerValue(req.headers['x-app-integrity']),
      body.device.deviceId,
      process.env,
      body.device.platform,
    );
    const session = await this.auth.verifyOtp(body.phone, body.code, {
      ...body.device,
      ip: req.ip,
    });
    setAuthCookies(res, session.accessToken, session.refreshToken);
    return session;
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.register(body, { ...body.device, ip: req.ip });
    setAuthCookies(res, session.accessToken, session.refreshToken);
    return {
      ok: true,
      message: 'REGISTER_OK',
      user: session.user,
    };
  }

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('signin')
  async signin(
    @Body() body: PasswordLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.loginWithPassword(body.phone, body.password, {
      ...body.device,
      ip: req.ip,
    });
    setAuthCookies(res, session.accessToken, session.refreshToken);
    return { ok: true, user: session.user };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  async resetPassword(
    @Body() body: ResetPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.resetPassword(
      body.phone,
      body.code,
      body.password,
      body.passwordConfirm,
      { ...body.device, ip: req.ip },
    );
    setAuthCookies(res, session.accessToken, session.refreshToken);
    return { ok: true, user: session.user };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Req() req: Request & { user: SubscriberPayload },
    @Body() body: ChangePasswordDto,
  ) {
    return this.auth.changePassword(
      req.user.userId,
      body.currentPassword,
      body.password,
      body.passwordConfirm,
    );
  }

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    verifyAppIntegrity(
      headerValue(req.headers['x-app-integrity']),
      body.device.deviceId,
      process.env,
      body.device.platform,
    );
    const session = await this.auth.login(body.phone, body.pin, {
      ...body.device,
      ip: req.ip,
    });
    setAuthCookies(res, session.accessToken, session.refreshToken);
    return session;
  }

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('refresh')
  async refresh(
    @Body() body: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = body.refreshToken || readCookie(req, REFRESH_COOKIE);
    const session = await this.auth.refresh(token ?? '');
    setAuthCookies(res, session.accessToken, session.refreshToken);
    return session;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: Request & { user: SubscriberPayload },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.logout(req.user.userId, req.user.deviceRecordId);
    clearAuthCookies(res);
    return result;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('set-pin')
  setPin(
    @Req() req: Request & { user: SubscriberPayload },
    @Body() body: SetPinDto,
  ) {
    return this.auth.setPin(req.user.userId, body.pin);
  }
}
