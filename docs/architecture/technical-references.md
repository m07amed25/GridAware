# Technical References Used for Phase 3.2

The following official references should be checked again when pinning actual dependencies in Phase 4 because Prisma and Neon integration details are version-sensitive.

1. [Prisma ORM v7 — PostgreSQL supported database](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql)
2. [Neon — Connect from Prisma](https://neon.com/docs/guides/prisma)
3. [Prisma ORM v7 — Prisma config reference](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference)
4. [Prisma ORM v7 — Database connections](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections)

These references inform the proposed separation of pooled runtime connections and direct migration connections. They do not pin the repository's final dependency versions; that occurs during Phase 4 after checking the selected stable releases and compatibility matrix.
