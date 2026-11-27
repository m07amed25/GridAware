import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { buildApiResponse } from '../common/envelopes/api-response.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  MembershipStatus,
  OrganizationStatus,
} from '../generated/prisma/enums.js';
import { AuthService } from './auth.service.js';
import {
  type AuthenticatedActor,
  CurrentUser,
} from './decorators/current-user.decorator.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';

@ApiTags('identity')
@Controller('me')
export class MeController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(AccessTokenGuard)
  @Get()
  @ApiCookieAuth('ga_access')
  @ApiOperation({
    summary: 'Current user identity and active organization memberships',
  })
  async getCurrentIdentity(@CurrentUser() actor: AuthenticatedActor) {
    const user = await this.authService.getMe(actor.userId);
    const membershipRows = this.prisma.membership
      ? await this.prisma.membership.findMany({
          where: {
            userId: actor.userId,
            status: MembershipStatus.ACTIVE,
            organization: {
              status: OrganizationStatus.ACTIVE,
            },
          },
          select: {
            id: true,
            organizationId: true,
            role: true,
            status: true,
            organization: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        })
      : [];

    const memberships = membershipRows.map((m) => ({
      membershipId: m.id,
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      organizationSlug: m.organization.slug,
      role: m.role,
      status: m.status,
    }));

    return buildApiResponse({
      ...user,
      memberships,
    });
  }
}
