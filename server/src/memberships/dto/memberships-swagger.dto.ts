import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MembershipRole,
  MembershipStatus,
} from '../../generated/prisma/enums.js';
import { ASSIGNABLE_NON_OWNER_ROLES } from './memberships.schemas.js';

export class MemberSummaryDto {
  @ApiProperty({ format: 'uuid' })
  membershipId!: string;

  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ enum: MembershipRole })
  role!: MembershipRole;

  @ApiProperty({ enum: MembershipStatus })
  status!: MembershipStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  suspendedAt!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  removedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ASSIGNABLE_NON_OWNER_ROLES })
  role!: (typeof ASSIGNABLE_NON_OWNER_ROLES)[number];
}

export class TransferOwnershipDto {
  @ApiProperty({ format: 'uuid' })
  targetMembershipId!: string;

  @ApiProperty({ example: true })
  confirmTransfer!: true;

  @ApiPropertyOptional({
    enum: ASSIGNABLE_NON_OWNER_ROLES,
    default: MembershipRole.FACILITY_MANAGER,
  })
  previousOwnerNextRole?: (typeof ASSIGNABLE_NON_OWNER_ROLES)[number];
}

export class OwnershipTransferDataDto {
  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty({ type: MemberSummaryDto })
  newOwnerMembership!: MemberSummaryDto;

  @ApiProperty({ type: MemberSummaryDto })
  previousOwnerMembership!: MemberSummaryDto;
}
