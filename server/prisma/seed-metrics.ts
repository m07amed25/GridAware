import 'dotenv/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma/client.js';

const CANONICAL_METRICS = [
  {
    key: 'temperature',
    displayName: 'Temperature',
    description: 'Thermal measurement for engines, HVAC, and transformers',
    dimension: 'TEMPERATURE',
    canonicalUnit: '°C',
    supportedUnits: ['°C', 'Cel', '°F', 'K'],
  },
  {
    key: 'vibration_velocity',
    displayName: 'Vibration Velocity',
    description: 'Mechanical vibration velocity for rotating equipment',
    dimension: 'VIBRATION',
    canonicalUnit: 'mm/s',
    supportedUnits: ['mm/s', 'in/s'],
  },
  {
    key: 'voltage',
    displayName: 'Voltage',
    description: 'Electrical potential measurement',
    dimension: 'ELECTRICAL',
    canonicalUnit: 'V',
    supportedUnits: ['V', 'kV', 'mV'],
  },
  {
    key: 'current',
    displayName: 'Current',
    description: 'Electrical current measurement',
    dimension: 'ELECTRICAL',
    canonicalUnit: 'A',
    supportedUnits: ['A', 'mA'],
  },
  {
    key: 'frequency',
    displayName: 'Frequency',
    description: 'Electrical or mechanical frequency measurement',
    dimension: 'FREQUENCY',
    canonicalUnit: 'Hz',
    supportedUnits: ['Hz', 'kHz'],
  },
  {
    key: 'pressure',
    displayName: 'Pressure',
    description: 'Fluid or gas pressure measurement',
    dimension: 'PRESSURE',
    canonicalUnit: 'kPa',
    supportedUnits: ['kPa', 'Pa', 'bar', 'psi'],
  },
  {
    key: 'flow_rate',
    displayName: 'Flow Rate',
    description: 'Volumetric flow rate measurement',
    dimension: 'FLOW',
    canonicalUnit: 'm3/h',
    supportedUnits: ['m3/h', 'L/min', 'gpm'],
  },
  {
    key: 'power',
    displayName: 'Power',
    description: 'Active electrical power measurement',
    dimension: 'POWER',
    canonicalUnit: 'kW',
    supportedUnits: ['kW', 'W', 'MW'],
  },
  {
    key: 'energy',
    displayName: 'Energy',
    description: 'Cumulative electrical energy measurement',
    dimension: 'ENERGY',
    canonicalUnit: 'kWh',
    supportedUnits: ['kWh', 'Wh', 'MWh'],
  },
] as const;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to seed metric definitions');
  }
  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    for (const metric of CANONICAL_METRICS) {
      await prisma.metricDefinition.upsert({
        where: { key: metric.key },
        update: {
          displayName: metric.displayName,
          description: metric.description,
          dimension: metric.dimension,
          canonicalUnit: metric.canonicalUnit,
          supportedUnits: [...metric.supportedUnits],
          isActive: true,
        },
        create: {
          key: metric.key,
          displayName: metric.displayName,
          description: metric.description,
          dimension: metric.dimension,
          canonicalUnit: metric.canonicalUnit,
          supportedUnits: [...metric.supportedUnits],
          isActive: true,
        },
      });
    }
    console.log(`Seeded ${CANONICAL_METRICS.length} canonical metric definitions.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
