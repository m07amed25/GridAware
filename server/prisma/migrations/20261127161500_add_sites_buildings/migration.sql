-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('FACTORY', 'INDUSTRIAL_FACILITY', 'COMMERCIAL_COMPLEX', 'COMMERCIAL_PROPERTY', 'CAMPUS', 'WAREHOUSE_CAMPUS', 'OTHER');

-- CreateEnum
CREATE TYPE "BuildingType" AS ENUM ('PRODUCTION', 'OFFICE', 'WAREHOUSE', 'UTILITY', 'RETAIL', 'PLANT_ROOM', 'PARKING', 'OTHER');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "SiteType" NOT NULL,
    "description" VARCHAR(2000),
    "addressLine1" VARCHAR(200),
    "addressLine2" VARCHAR(200),
    "city" VARCHAR(200),
    "region" VARCHAR(200),
    "postalCode" VARCHAR(32),
    "countryCode" VARCHAR(2),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timeZone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "status" "LocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sites_latitude_range_chk" CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)),
    CONSTRAINT "sites_longitude_range_chk" CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180)),
    CONSTRAINT "sites_coordinates_pair_chk" CHECK (("latitude" IS NULL) = ("longitude" IS NULL)),
    CONSTRAINT "sites_country_code_format_chk" CHECK ("countryCode" IS NULL OR "countryCode" ~ '^[A-Z]{2}$')
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "BuildingType" NOT NULL,
    "description" VARCHAR(2000),
    "floorCount" INTEGER,
    "grossAreaSqM" DECIMAL(12,2),
    "status" "LocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "buildings_floor_count_range_chk" CHECK ("floorCount" IS NULL OR ("floorCount" >= 1 AND "floorCount" <= 200)),
    CONSTRAINT "buildings_gross_area_positive_chk" CHECK ("grossAreaSqM" IS NULL OR "grossAreaSqM" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "sites_id_organizationId_key" ON "sites"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "sites_organizationId_code_key" ON "sites"("organizationId", "code");

-- CreateIndex
CREATE INDEX "sites_organizationId_status_archivedAt_createdAt_idx" ON "sites"("organizationId", "status", "archivedAt", "createdAt");

-- CreateIndex
CREATE INDEX "sites_organizationId_city_idx" ON "sites"("organizationId", "city");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_id_organizationId_key" ON "buildings"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_id_siteId_organizationId_key" ON "buildings"("id", "siteId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_siteId_code_key" ON "buildings"("siteId", "code");

-- CreateIndex
CREATE INDEX "buildings_organizationId_siteId_status_archivedAt_createdAt_idx" ON "buildings"("organizationId", "siteId", "status", "archivedAt", "createdAt");

-- CreateIndex
CREATE INDEX "buildings_organizationId_status_idx" ON "buildings"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_siteId_organizationId_fkey" FOREIGN KEY ("siteId", "organizationId") REFERENCES "sites"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
