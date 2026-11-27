import { z } from 'zod';
import {
  MembershipRole,
  MembershipStatus,
} from '../../generated/prisma/enums.js';

export const ASSIGNABLE_NON_OWNER_ROLES = [
  MembershipRole.FACILITY_MANAGER,
  MembershipRole.ENGINEER,
  MembershipRole.TECHNICIAN,
  MembershipRole.VIEWER,
] as const;

export type AssignableNonOwnerRole =
  (typeof ASSIGNABLE_NON_OWNER_ROLES)[number];

export const AssignableNonOwnerRoleSchema = z.enum(ASSIGNABLE_NON_OWNER_ROLES, {
  error: () =>
    'Role must be one of FACILITY_MANAGER, ENGINEER, TECHNICIAN, or VIEWER. Ownership changes require the dedicated ownership-transfer workflow.',
});

export const UpdateMemberRoleSchema = z
  .object({
    role: AssignableNonOwnerRoleSchema,
  })
  .strict();

export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;

export const TransferOwnershipSchema = z
  .object({
    targetMembershipId: z.uuid('targetMembershipId must be a valid UUID.'),
    confirmTransfer: z.literal(true, {
      error: () => 'Explicit confirmation (confirmTransfer: true) is required.',
    }),
    previousOwnerNextRole: AssignableNonOwnerRoleSchema.optional(),
  })
  .strict();

export type TransferOwnershipInput = z.infer<typeof TransferOwnershipSchema>;

export const InviteRoleValidationSchema = z
  .object({
    role: AssignableNonOwnerRoleSchema,
  })
  .strict();

export const ListMembersQuerySchema = z
  .object({
    status: z.enum(MembershipStatus).optional(),
    role: z.enum(MembershipRole).optional(),
    limit: z.preprocess(
      (value) => {
        if (value === undefined || value === '') return 25;
        if (typeof value === 'string' && /^\d+$/.test(value)) {
          return Number.parseInt(value, 10);
        }
        return value;
      },
      z.int().min(1).max(100),
    ),
    cursor: z.string().min(1).max(512).optional(),
  })
  .strict();

export type ListMembersQueryInput = z.infer<typeof ListMembersQuerySchema>;

export const MembershipIdParamSchema = z.uuid(
  'membershipId must be a valid UUID.',
);
