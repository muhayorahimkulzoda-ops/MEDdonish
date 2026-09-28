import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './admin-login.dto';

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  private readonly adminAuth: AdminAuthService;

  constructor(@Inject(AdminAuthService) adminAuth: AdminAuthService) {
    this.adminAuth = adminAuth;
  }

  @Post('login')
  login(@Body() body: AdminLoginDto) {
    return this.adminAuth.login(body.email, body.password, body.totp);
  }
}
