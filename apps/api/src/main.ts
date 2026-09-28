import 'reflect-metadata';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { assertRuntimeSecrets } from './common/runtime-secrets';
import { loadManagedSecrets } from './common/secret-manager';
import { accessLog } from './common/access-log';
import { requestId } from './common/request-id';
import { securityHeaders } from './common/security-headers';

function hydrateDotenv() {
  const files = [
    resolve(__dirname, '../../../.env'),
    resolve(__dirname, '../.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(process.cwd(), '.env'),
  ];
  const seen = new Set<string>();
  for (const file of files) {
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      const [, key, raw] = match;
      const value = raw.trim();
      if (!value) continue;
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

async function bootstrap() {
  hydrateDotenv();
  loadManagedSecrets();
  assertRuntimeSecrets();
  const app = await NestFactory.create(AppModule);
  if (process.env.TRUST_PROXY === 'true') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }
  app.setGlobalPrefix('api/v1');
  app.use(requestId);
  app.use(securityHeaders);
  app.use(accessLog);
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, isAllowedCorsOrigin(origin));
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';
  if (swaggerEnabled) {
    const swagger = new DocumentBuilder()
      .setTitle('MEDdonish API')
      .setDescription('ONE BACKEND — MULTIPLE CLIENTS')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));
  }

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}

function isAllowedCorsOrigin(origin?: string) {
  if (!origin) return true;
  const configured = [
    process.env.WEB_ORIGIN ?? 'http://localhost:3001',
    process.env.ADMIN_ORIGIN ?? 'http://localhost:3002',
    process.env.HTTPS_WEB_ORIGIN,
    process.env.HTTPS_ADMIN_ORIGIN,
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
  ].filter((value): value is string => Boolean(value));
  if (configured.includes(origin)) return true;
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    const loopback = host === 'localhost' || host === '127.0.0.1';
    const privateLan =
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
    return url.protocol === 'http:' && (loopback || privateLan);
  } catch {
    return false;
  }
}

void bootstrap();
