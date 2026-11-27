import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma, User, UserStatus } from '../generated/prisma/client.js';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User | null> {
    return (tx ?? this.prisma).user.findUnique({ where: { id } });
  }

  async findByNormalizedEmail(
    normalizedEmail: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User | null> {
    return (tx ?? this.prisma).user.findUnique({
      where: { normalizedEmail },
    });
  }

  async create(
    data: {
      email: string;
      normalizedEmail: string;
      displayName: string;
      passwordHash: string;
      status: UserStatus;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return (tx ?? this.prisma).user.create({ data });
  }

  async updateStatus(
    id: string,
    status: UserStatus,
    extra: { emailVerifiedAt?: Date } = {},
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return (tx ?? this.prisma).user.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  async updatePasswordHash(
    id: string,
    passwordHash: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return (tx ?? this.prisma).user.update({
      where: { id },
      data: { passwordHash },
    });
  }
}
