import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Errors } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';

export interface AdminJwt {
  sub: string;
  tokenType: 'admin';
}

export interface AdminPayload {
  adminId: string;
  email: string;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  private readonly prisma: PrismaService;

  constructor(@Inject(PrismaService) prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ADMIN_ACCESS_SECRET ?? 'dev-change-me-admin-access',
      issuer: 'meddonish-api',
      audience: 'meddonish-admin',
      algorithms: ['HS256'],
    });
    this.prisma = prisma;
  }

  async validate(payload: AdminJwt): Promise<AdminPayload> {
    if (payload.tokenType !== 'admin') {
      throw Errors.adminInvalid();
    }
    const admin = await this.prisma.adminAccount.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) {
      throw Errors.adminInvalid();
    }
    return { adminId: admin.id, email: admin.email };
  }
}
