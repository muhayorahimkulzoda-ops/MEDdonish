import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

export function sanitizeRequestId(value?: string) {
  if (!value) return randomUUID();
  const trimmed = value.trim();
  if (/^[A-Za-z0-9._-]{8,64}$/.test(trimmed)) return trimmed;
  return randomUUID();
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = sanitizeRequestId(req.header(REQUEST_ID_HEADER));
  req.headers[REQUEST_ID_HEADER] = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}
