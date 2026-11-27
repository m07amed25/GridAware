import {
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type {
  OrganizationAuthorizationContext,
  RequestWithOrganizationContext,
} from '../authorization.types.js';

export const OrgContext = createParamDecorator(
  (
    _data: unknown,
    ctx: ExecutionContext,
  ): OrganizationAuthorizationContext | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<RequestWithOrganizationContext>();
    return request.organizationContext;
  },
);
