/**
 * Development-only demo seed script for Phase 5.4 Sites & Buildings.
 *
 * SAFETY GUARD: Refuses to execute when NODE_ENV === 'production'.
 * All records created by this script are explicitly labeled as fictitious
 * development/demo fixtures and MUST NEVER be mistaken for customer data.
 */
import '../src/load-env.js';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  BuildingType,
  LocationStatus,
  OrganizationStatus,
  SiteType,
} from '../src/generated/prisma/enums.js';

async function main() {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      'Refusing to run demo locations seed in production (NODE_ENV=production).',
    );
  }

  const connectionString =
    process.env['DATABASE_URL_UNPOOLED'] ?? process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED must be configured.');
  }

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const demoOrg = await prisma.organization.upsert({
      where: { slug: 'demo-gridaware-facilities' },
      update: {},
      create: {
        name: '[DEMO FIXTURE] GridAware Sample Facilities',
        slug: 'demo-gridaware-facilities',
        status: OrganizationStatus.ACTIVE,
        timezone: 'Africa/Cairo',
      },
    });

    const factorySite = await prisma.site.upsert({
      where: {
        organizationId_code: {
          organizationId: demoOrg.id,
          code: 'CAI-PLANT-01',
        },
      },
      update: {},
      create: {
        organizationId: demoOrg.id,
        code: 'CAI-PLANT-01',
        name: 'Cairo Manufacturing Plant (Demo)',
        type: SiteType.FACTORY,
        description:
          'Fictitious development demo fixture representing an industrial manufacturing facility.',
        addressLine1: '10th of Ramadan Industrial Zone',
        city: 'Cairo',
        region: 'Cairo Governorate',
        postalCode: '11835',
        countryCode: 'EG',
        latitude: 30.0444,
        longitude: 31.2357,
        timeZone: 'Africa/Cairo',
        status: LocationStatus.ACTIVE,
      },
    });

    const commercialSite = await prisma.site.upsert({
      where: {
        organizationId_code: {
          organizationId: demoOrg.id,
          code: 'CAI-PARK-02',
        },
      },
      update: {},
      create: {
        organizationId: demoOrg.id,
        code: 'CAI-PARK-02',
        name: 'Cairo Business Park (Demo)',
        type: SiteType.COMMERCIAL_COMPLEX,
        description:
          'Fictitious development demo fixture representing a multi-tower commercial property.',
        addressLine1: 'New Cairo Fifth Settlement',
        city: 'Cairo',
        region: 'Cairo Governorate',
        postalCode: '11865',
        countryCode: 'EG',
        latitude: 30.0131,
        longitude: 31.4913,
        timeZone: 'Africa/Cairo',
        status: LocationStatus.ACTIVE,
      },
    });

    const factoryBuildings = [
      {
        code: 'PROD-HALL-01',
        name: 'Production Hall 1',
        type: BuildingType.PRODUCTION,
        description: 'Demo fixture: primary assembly and fabrication bay.',
        floorCount: 2,
        grossAreaSqM: '4200.00',
      },
      {
        code: 'UTIL-BLD-01',
        name: 'Utilities Building',
        type: BuildingType.UTILITY,
        description: 'Demo fixture: backup generation and switchgear house.',
        floorCount: 1,
        grossAreaSqM: '850.00',
      },
      {
        code: 'WH-EAST-01',
        name: 'Warehouse',
        type: BuildingType.WAREHOUSE,
        description: 'Demo fixture: finished-goods storage and dispatch bay.',
        floorCount: 1,
        grossAreaSqM: '3100.50',
      },
    ] as const;

    for (const b of factoryBuildings) {
      await prisma.building.upsert({
        where: {
          siteId_code: {
            siteId: factorySite.id,
            code: b.code,
          },
        },
        update: {},
        create: {
          organizationId: demoOrg.id,
          siteId: factorySite.id,
          code: b.code,
          name: b.name,
          type: b.type,
          description: b.description,
          floorCount: b.floorCount,
          grossAreaSqM: b.grossAreaSqM,
          status: LocationStatus.ACTIVE,
        },
      });
    }

    const parkBuildings = [
      {
        code: 'TOWER-A',
        name: 'Tower A',
        type: BuildingType.OFFICE,
        description: 'Demo fixture: commercial office tower A.',
        floorCount: 12,
        grossAreaSqM: '14800.00',
      },
      {
        code: 'TOWER-B',
        name: 'Tower B',
        type: BuildingType.OFFICE,
        description: 'Demo fixture: commercial office tower B.',
        floorCount: 10,
        grossAreaSqM: '12450.25',
      },
    ] as const;

    for (const b of parkBuildings) {
      await prisma.building.upsert({
        where: {
          siteId_code: {
            siteId: commercialSite.id,
            code: b.code,
          },
        },
        update: {},
        create: {
          organizationId: demoOrg.id,
          siteId: commercialSite.id,
          code: b.code,
          name: b.name,
          type: b.type,
          description: b.description,
          floorCount: b.floorCount,
          grossAreaSqM: b.grossAreaSqM,
          status: LocationStatus.ACTIVE,
        },
      });
    }

    console.log(
      `[seed-demo-locations] Seeded demo fixtures under organization "${demoOrg.slug}" (${demoOrg.id}): 2 sites, 5 buildings.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[seed-demo-locations] Failed:', error);
  process.exit(1);
});
