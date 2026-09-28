import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Errors } from '../../common/errors';
import { ACCESS_COOKIE, CSRF_COOKIE, readCookie } from './cookies';

const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request>();
    if (!WRITE.has(req.method.toUpperCase())) return next.handle();
    if (!readCookie(req, ACCESS_COOKIE)) return next.handle();
    const cookie = readCookie(req, CSRF_COOKIE);
    const header = req.headers['x-csrf-token'];
    const sent = Array.isArray(header) ? header[0] : header;
    if (!cookie || !sent || cookie !== sent) throw Errors.csrfInvalid();
    return next.handle();
  }
}
