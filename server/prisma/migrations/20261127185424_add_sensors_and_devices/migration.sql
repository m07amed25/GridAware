-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('GATEWAY', 'SIMULATOR', 'EDGE_CONTROLLER', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'RETIRED');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('PASSWORD', 'CERTIFICATE');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'ROTATED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SensorStatus" AS ENUM ('PLANNED', 'ACTIVE', 'MAINTENANCE', 'DISABLED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "MetricValueType" AS ENUM ('NUMERIC');

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "siteId" UUID NOT NULL,
    "buildingId" UUID,
    "assetCode" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "assetType" VARCHAR(60) NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "siteId" UUID,
    "assetId" UUID,
    "deviceKey" VARCHAR(100) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "deviceType" "DeviceType" NOT NULL DEFAULT 'SIMULATOR',
    "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING',
    "serialNumber" VARCHAR(120),
    "manufacturer" VARCHAR(120),
    "model" VARCHAR(120),
    "firmwareVersion" VARCHAR(80),
    "metadata" JSONB,
    "lastSeenAt" TIMESTAMPTZ(6),
    "lastConnectedAt" TIMESTAMPTZ(6),
    "lastDisconnectedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_credentials" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "credentialVersion" INTEGER NOT NULL,
    "credentialType" "CredentialType" NOT NULL DEFAULT 'PASSWORD',
    "secretHash" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6),
    "lastUsedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensors" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "sensorKey" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "sensorType" VARCHAR(80) NOT NULL,
    "status" "SensorStatus" NOT NULL DEFAULT 'PLANNED',
    "installationLocation" VARCHAR(160),
    "manufacturer" VARCHAR(120),
    "model" VARCHAR(120),
    "serialNumber" VARCHAR(120),
    "samplingIntervalSeconds" INTEGER,
    "expectedReportingIntervalSeconds" INTEGER,
    "lastReadingAt" TIMESTAMPTZ(6),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_definitions" (
    "key" VARCHAR(80) NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "dimension" VARCHAR(60) NOT NULL,
    "canonicalUnit" VARCHAR(20) NOT NULL,
    "supportedUnits" TEXT[],
    "valueType" "MetricValueType" NOT NULL DEFAULT 'NUMERIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "metric_definitions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "sensor_metrics" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "sensorId" UUID NOT NULL,
    "metricKey" VARCHAR(80) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "precision" INTEGER,
    "minPlausibleValue" DOUBLE PRECISION,
    "maxPlausibleValue" DOUBLE PRECISION,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "configuration" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sensor_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_sensor_assignments" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "sensorId" UUID NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMPTZ(6),
    "assignedById" UUID NOT NULL,

    CONSTRAINT "device_sensor_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assets_organizationId_siteId_idx" ON "assets"("organizationId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "assets_organizationId_assetCode_key" ON "assets"("organizationId", "assetCode");

-- CreateIndex
CREATE UNIQUE INDEX "assets_id_organizationId_key" ON "assets"("id", "organizationId");

-- CreateIndex
CREATE INDEX "devices_organizationId_status_idx" ON "devices"("organizationId", "status");

-- CreateIndex
CREATE INDEX "devices_organizationId_lastSeenAt_idx" ON "devices"("organizationId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "devices_organizationId_deviceKey_key" ON "devices"("organizationId", "deviceKey");

-- CreateIndex
CREATE UNIQUE INDEX "devices_id_organizationId_key" ON "devices"("id", "organizationId");

-- CreateIndex
CREATE INDEX "device_credentials_organizationId_deviceId_status_idx" ON "device_credentials"("organizationId", "deviceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "device_credentials_deviceId_credentialVersion_key" ON "device_credentials"("deviceId", "credentialVersion");

-- CreateIndex
CREATE INDEX "sensors_organizationId_assetId_idx" ON "sensors"("organizationId", "assetId");

-- CreateIndex
CREATE INDEX "sensors_organizationId_status_idx" ON "sensors"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sensors_organizationId_sensorKey_key" ON "sensors"("organizationId", "sensorKey");

-- CreateIndex
CREATE UNIQUE INDEX "sensors_id_organizationId_key" ON "sensors"("id", "organizationId");

-- CreateIndex
CREATE INDEX "sensor_metrics_organizationId_sensorId_idx" ON "sensor_metrics"("organizationId", "sensorId");

-- CreateIndex
CREATE UNIQUE INDEX "sensor_metrics_sensorId_metricKey_key" ON "sensor_metrics"("sensorId", "metricKey");

-- CreateIndex
CREATE INDEX "device_sensor_assignments_organizationId_sensorId_status_idx" ON "device_sensor_assignments"("organizationId", "sensorId", "status");

-- CreateIndex
CREATE INDEX "device_sensor_assignments_organizationId_deviceId_status_idx" ON "device_sensor_assignments"("organizationId", "deviceId", "status");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_siteId_organizationId_fkey" FOREIGN KEY ("siteId", "organizationId") REFERENCES "sites"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_buildingId_organizationId_fkey" FOREIGN KEY ("buildingId", "organizationId") REFERENCES "buildings"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_siteId_organizationId_fkey" FOREIGN KEY ("siteId", "organizationId") REFERENCES "sites"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_assetId_organizationId_fkey" FOREIGN KEY ("assetId", "organizationId") REFERENCES "assets"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_credentials" ADD CONSTRAINT "device_credentials_deviceId_organizationId_fkey" FOREIGN KEY ("deviceId", "organizationId") REFERENCES "devices"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_credentials" ADD CONSTRAINT "device_credentials_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_assetId_organizationId_fkey" FOREIGN KEY ("assetId", "organizationId") REFERENCES "assets"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_metrics" ADD CONSTRAINT "sensor_metrics_sensorId_organizationId_fkey" FOREIGN KEY ("sensorId", "organizationId") REFERENCES "sensors"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_metrics" ADD CONSTRAINT "sensor_metrics_metricKey_fkey" FOREIGN KEY ("metricKey") REFERENCES "metric_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_sensor_assignments" ADD CONSTRAINT "device_sensor_assignments_deviceId_organizationId_fkey" FOREIGN KEY ("deviceId", "organizationId") REFERENCES "devices"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_sensor_assignments" ADD CONSTRAINT "device_sensor_assignments_sensorId_organizationId_fkey" FOREIGN KEY ("sensorId", "organizationId") REFERENCES "sensors"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_sensor_assignments" ADD CONSTRAINT "device_sensor_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "organization_invitations_organizationId_normalizedEmail_status_" RENAME TO "organization_invitations_organizationId_normalizedEmail_sta_idx";
