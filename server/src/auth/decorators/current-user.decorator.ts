import {
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { UserStatus } from '../../generated/prisma/enums.js';

export interface AuthenticatedActor {
  userId: string;
  sessionId: string;
  email: string;
  status: UserStatus;
}

export type RequestWithActor = Request & {
  user?: AuthenticatedActor;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedActor | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithActor>();
    return request.user;
  },
);
