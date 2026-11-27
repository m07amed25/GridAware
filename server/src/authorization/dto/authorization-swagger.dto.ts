import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole } from '../../generated/prisma/enums.js';
import { ALL_PERMISSIONS, type Permission } from '../authorization.types.js';

export class AccessContextDataDto {
  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty({ example: 'demo-gridaware-facilities' })
  organizationSlug!: string;

  @ApiProperty({ format: 'uuid' })
  membershipId!: string;

  @ApiProperty({ enum: MembershipRole })
  role!: MembershipRole;

  @ApiProperty({ enum: ALL_PERMISSIONS, isArray: true })
  permissions!: Permission[];

  @ApiProperty({ example: '1' })
  policyVersion!: string;
}
