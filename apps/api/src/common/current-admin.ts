import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AdminPayload } from '../modules/admin-auth/admin-jwt.strategy';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: AdminPayload }>();
    return request.user;
  },
);
