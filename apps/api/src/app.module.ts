import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { CatalogController } from './modules/catalog/catalog.controller';
import { EntitlementsController } from './modules/entitlements/entitlements.controller';
import { UsersController } from './modules/users/users.controller';
import { AccountDeletionService } from './modules/users/account-deletion.service';
import { AccountExportService } from './modules/users/account-export.service';
import { HealthModule } from './modules/health/health.module';
import { MediaModule } from './modules/media/media.module';
import { TestingModule } from './modules/testing/testing.module';
import { ClinicalModule } from './modules/clinical/clinical.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { AdminSystemModule } from './modules/settings/admin-system.module';
import { JwtModule } from '@nestjs/jwt';
import { CsrfInterceptor } from './modules/auth/csrf.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
    }),
    JwtModule.register({}),
    PrismaModule,
    AuthModule,
    AdminAuthModule,
    MediaModule,
    TestingModule,
    ClinicalModule,
    PaymentsModule,
    NotificationsModule,
    AnalyticsModule,
    AiModule,
    AdminSystemModule,
    HealthModule,
  ],
  controllers: [
    CatalogController,
    UsersController,
    EntitlementsController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: CsrfInterceptor },
    AccountDeletionService,
    AccountExportService,
  ],
})
export class AppModule {}
