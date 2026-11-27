import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import { EnvService } from '../../config/env.service.js';
import { MembershipRole } from '../../generated/prisma/enums.js';
import { AuthorizationService } from '../authorization.service.js';
import type { OrganizationAuthorizationContext } from '../authorization.types.js';
import { ResourceTenantPolicy } from './resource-tenant.policy.js';

export type SimulationTargetKind = 'SIMULATOR' | 'PHYSICAL_EQUIPMENT';

export interface SimulatorControlTarget {
  readonly organizationId: string;
  readonly targetKind: SimulationTargetKind;
  readonly isDemoScenario: boolean;
}

@Injectable()
export class SimulatorPolicy {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly tenantPolicy: ResourceTenantPolicy,
    private readonly env: EnvService,
  ) {}

  assertCanControl(
    context: OrganizationAuthorizationContext,
    target: SimulatorControlTarget | null | undefined,
  ): SimulatorControlTarget {
    // Constitutional Principle II: NEVER permit physical equipment control for any role.
    if (target && target.targetKind !== 'SIMULATOR') {
      throw AppException.forbidden(
        'Physical equipment actuation and control commands are prohibited.',
      );
    }

    if (!this.authorization.hasPermission(context, 'simulator:control')) {
      throw AppException.forbidden(
        'Insufficient permissions to control simulator runs.',
      );
    }

    const verified = this.tenantPolicy.assertSameTenant(context, target);

    if (context.role === MembershipRole.ENGINEER) {
      if (
        this.env.isProduction ||
        !this.env.simulatorDemoControlEnabled ||
        !verified.isDemoScenario
      ) {
        throw AppException.forbidden(
          'Engineer simulator control is restricted to explicitly enabled non-production demo scenarios.',
        );
      }
    }

    return verified;
  }
}
