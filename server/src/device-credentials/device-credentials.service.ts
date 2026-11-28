import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import {
  CredentialStatus,
  CredentialType,
} from '../generated/prisma/enums.js';
import { CredentialHasher } from './credential-hasher.js';

export interface IssuedCredentialResult {
  readonly credentialId: string;
  readonly credentialVersion: number;
  readonly credentialType: CredentialType;
  readonly plaintextSecret: string;
  readonly issuedAt: Date;
  readonly expiresAt: Date | null;
}

@Injectable()
export class DeviceCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hasher: CredentialHasher,
  ) {}

  /**
   * Issues a new credential version and immediately invalidates any prior ACTIVE credential
   * (maintaining at most one ACTIVE credential per device).
   */
  async issueCredential(params: {
    organizationId: string;
    deviceId: string;
    createdById: string;
    expiresAt?: Date | null;
  }): Promise<IssuedCredentialResult> {
    const plaintextSecret = this.hasher.generateSecret();
    const secretHash = await this.hasher.hashSecret(plaintextSecret);
    const now = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.deviceCredential.updateMany({
        where: {
          organizationId: params.organizationId,
          deviceId: params.deviceId,
          status: CredentialStatus.ACTIVE,
        },
        data: {
          status: CredentialStatus.ROTATED,
          revokedAt: now,
        },
      });

      const latest = await tx.deviceCredential.findFirst({
        where: {
          organizationId: params.organizationId,
          deviceId: params.deviceId,
        },
        orderBy: { credentialVersion: 'desc' },
        select: { credentialVersion: true },
      });

      const nextVersion = (latest?.credentialVersion ?? 0) + 1;

      return tx.deviceCredential.create({
        data: {
          organizationId: params.organizationId,
          deviceId: params.deviceId,
          credentialVersion: nextVersion,
          credentialType: CredentialType.PASSWORD,
          secretHash,
          status: CredentialStatus.ACTIVE,
          issuedAt: now,
          expiresAt: params.expiresAt ?? null,
          createdById: params.createdById,
        },
      });
    });

    return {
      credentialId: created.id,
      credentialVersion: created.credentialVersion,
      credentialType: created.credentialType,
      plaintextSecret,
      issuedAt: created.issuedAt,
      expiresAt: created.expiresAt,
    };
  }

  async revokeAllForDevice(organizationId: string, deviceId: string) {
    const now = new Date();
    await this.prisma.deviceCredential.updateMany({
      where: {
        organizationId,
        deviceId,
        status: CredentialStatus.ACTIVE,
      },
      data: {
        status: CredentialStatus.REVOKED,
        revokedAt: now,
      },
    });
  }

  async hasActiveCredential(
    organizationId: string,
    deviceId: string,
  ): Promise<boolean> {
    const count = await this.prisma.deviceCredential.count({
      where: {
        organizationId,
        deviceId,
        status: CredentialStatus.ACTIVE,
      },
    });
    return count > 0;
  }

  /**
   * Returns non-secret credential metadata ONLY. Never selects or returns secretHash.
   */
  async listMetadata(organizationId: string, deviceId: string) {
    return this.prisma.deviceCredential.findMany({
      where: { organizationId, deviceId },
      orderBy: { credentialVersion: 'desc' },
      select: {
        id: true,
        credentialVersion: true,
        credentialType: true,
        status: true,
        issuedAt: true,
        expiresAt: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
  }
}
