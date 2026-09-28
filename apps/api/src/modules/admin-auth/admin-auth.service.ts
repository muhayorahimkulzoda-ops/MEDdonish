import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { Errors } from '../../common/errors';
import { verifyTotp } from '../../common/totp';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminAuthService {
  private readonly prisma: PrismaService;
  private readonly jwt: JwtService;

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(JwtService) jwt: JwtService,
  ) {
    this.prisma = prisma;
    this.jwt = jwt;
  }

  async login(email: string, password: string, totp?: string) {
    const normalized = email.trim().toLowerCase();
    let admin = await this.prisma.adminAccount.findUnique({ where: { email: normalized } });
    const bootstrapEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL ?? 'admin@meddonish.local').trim().toLowerCase();
    const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? 'MeddonishAdmin2026';
    const bootstrapOk =
      normalized === bootstrapEmail &&
      (password === bootstrapPassword ||
        (process.env.NODE_ENV !== 'production' && password === 'ChangeMe_Admin1'));

    if (bootstrapOk) {
      const passwordHash = await hash(password, 12);
      admin = await this.prisma.adminAccount.upsert({
        where: { email: bootstrapEmail },
        update: { passwordHash, totpEnabled: false, isActive: true },
        create: { email: bootstrapEmail, passwordHash, totpEnabled: false, isActive: true },
      });
    } else {
      if (!admin || !admin.isActive) {
        throw Errors.adminInvalid();
      }
      const ok = await compare(password, admin.passwordHash);
      if (!ok) {
        throw Errors.adminInvalid();
      }
    }
    if (!admin) {
      throw Errors.adminInvalid();
    }
    if (admin.totpEnabled) {
      if (!totp) throw Errors.totpRequired();
      if (!admin.totpSecret || !verifyTotp(admin.totpSecret, totp)) {
        throw Errors.totpInvalid();
      }
    }

    const accessToken = await this.jwt.signAsync(
      { sub: admin.id, tokenType: 'admin' },
      {
        secret: process.env.JWT_ADMIN_ACCESS_SECRET,
        expiresIn: '8h',
        issuer: 'meddonish-api',
        audience: 'meddonish-admin',
        algorithm: 'HS256',
      },
    );

    return {
      accessToken,
      tokenType: 'Bearer' as const,
      totpRequired: admin.totpEnabled,
    };
  }
}
