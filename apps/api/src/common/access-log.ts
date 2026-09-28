import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from './request-id';

const logger = new Logger('HTTP');

function shouldSkip(path: string) {
  return path === '/api/v1/health' || path === '/health';
}

export function accessLog(req: Request, res: Response, next: NextFunction) {
  const started = Date.now();
  res.on('finish', () => {
    const path = req.path || '/';
    if (shouldSkip(path)) return;
    logger.log(
      `${req.method} ${path} ${res.statusCode} ${Date.now() - started}ms ${req.header(REQUEST_ID_HEADER) ?? '-'}`,
    );
  });
  next();
}
