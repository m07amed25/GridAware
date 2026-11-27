import { describe, expect, it, vi } from 'vitest';
import type { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { UUID_PATTERN } from '../authorization/authorization.constants.js';
import { OrganizationStatus } from '../generated/prisma/enums.js';
import type { OrganizationsRepository } from './organizations.repository.js';
import { OrganizationsService } from './organizations.service.js';

describe('OrganizationsService slug generation', () => {
  it('never auto-generates a UUID-shaped slug when organization name looks like a UUID', async () => {
    const fakeTx = {} as never;
    const createWithOwner = vi.fn().mockImplementation(async (data: { slug: string; name: string; timezone: string }) => ({
      organization: {
        id: '99999999-9999-4999-8999-999999999999',
        name: data.name,
        slug: data.slug,
        timezone: data.timezone,
        status: OrganizationStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      membershipId: '88888888-8888-4888-8888-888888888888',
    }));
    const repo = {
      runInTransaction: vi.fn(async <T>(fn: (tx: never) => Promise<T>): Promise<T> => fn(fakeTx)),
      findBySlug: vi.fn().mockResolvedValue(null),
      createWithOwner,
    } as unknown as OrganizationsRepository;
    const auditLogs = { record: vi.fn().mockResolvedValue(undefined) } as unknown as AuditLogsService;
    const service = new OrganizationsService(repo, auditLogs);

    const created = await service.createOrganization(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      { name: '11111111-1111-4111-8111-111111111111' },
    );

    expect(UUID_PATTERN.test(created.slug)).toBe(false);
    expect(created.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});
