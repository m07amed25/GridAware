---

description: "Actionable, dependency-ordered task list for Phase 5.6 Sensors & Device Management"
---

# Tasks: Sensors & Device Management

**Input**: Design documents from `/specs/005-sensors-device-management/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/rest-api.md`, `contracts/mqtt-envelope.md`, `quickstart.md`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (`[US1]`–`[US6]`) for story phases only
- Every task includes exact file paths and explicit `data-model.md` citations for constrained fields.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure local Mosquitto broker configuration and NestJS module scaffolding are ready.

- [X] T001 Configure local Mosquitto broker with anonymous access disabled and password/ACL file paths in `docker/mosquitto/mosquitto.conf` and `docker/mosquitto/entrypoint.sh`
- [X] T002 [P] Register new domain modules (`AssetsModule`, `MetricCatalogModule`, `DevicesModule`, `SensorsModule`, `DeviceCredentialsModule`, `DeviceProvisioningModule`, `MqttAccessModule`) in `server/src/app.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema, migrations, RBAC permissions, metric catalog seed, and minimal Asset foundation required before any user story can execute.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add enums (`AssetStatus`, `DeviceType`, `DeviceStatus`, `CredentialType`, `CredentialStatus`, `SensorStatus`, `AssignmentStatus`, `MetricValueType`) and models (`Asset`, `Device`, `DeviceCredential`, `Sensor`, `MetricDefinition`, `SensorMetric`, `DeviceSensorAssignment`) with tenant-safe composite keys per `data-model.md` in `server/prisma/schema.prisma`
- [ ] T004 Generate Prisma migration and add reviewed PostgreSQL partial unique indexes for single active `DeviceCredential` per device and single active `DeviceSensorAssignment` per `(organization_id, sensor_id)` in `server/prisma/migrations/`
- [X] T005 [P] Implement canonical metric catalog seed script (`temperature`, `vibration_velocity`, `voltage`, `current`, `frequency`, `pressure`, `flow_rate`, `power`, `energy`) per `data-model.md` (`MetricDefinition.key`, `MetricDefinition.canonicalUnit`, `MetricDefinition.supportedUnits`) in `server/prisma/seed-metrics.ts` and wire `seed:metrics` in `server/package.json`
- [X] T006 [P] Add `assets.*`, `devices.*`, `sensors.*`, and `device_credentials.provision` permission keys and role matrix (restricting `device_credentials.provision`, `devices.rotate_credentials`, `devices.suspend`, `devices.revoke` to `OWNER` and `FACILITY_MANAGER`; scoping `TECHNICIAN`) in `server/src/authorization/authorization.constants.ts` and `server/src/authorization/permission-map.ts`
- [X] T007 [P] Implement minimal tenant-scoped `AssetsModule` (`GET /api/v1/assets`, `POST /api/v1/assets`, `GET /api/v1/assets/:assetId`) validating `Asset.assetCode`, `Asset.name`, `Asset.assetType`, `Asset.siteId`, and `Asset.buildingId` per `data-model.md` in `server/src/assets/`
- [X] T008 [P] Implement `MetricCatalogModule` (`GET /api/v1/metric-definitions` and unit-compatibility validator) in `server/src/metric-catalog/metric-catalog.service.ts` and `server/src/metric-catalog/metric-catalog.controller.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Register and Provision a Connected Device (Priority: P1) 🎯 MVP

**Goal**: Authorize users to register a `PENDING` device under an organization, issue one-time credentials without storing/logging plaintext secrets, sync broker ACLs, and explicitly activate the device.

**Independent Test**: Register a device (`PENDING`), provision one-time credentials, verify `GET /devices/:id/credentials` exposes zero secret material, activate the device (`ACTIVE`), and verify cross-tenant asset/site links are rejected.

- [X] T009 [P] [US1] Create device registration and update DTOs enforcing `Device.deviceKey`, `Device.name`, `Device.deviceType`, `Device.serialNumber`, `Device.metadata`, `Device.siteId`, and `Device.assetId` constraints per `data-model.md` in `server/src/devices/dto/`
- [X] T010 [P] [US1] Implement `CredentialHasher` and `DeviceCredentialsService` (high-entropy secret generation, non-plaintext `DeviceCredential.secretHash` storage, monotonic `DeviceCredential.credentialVersion` per `data-model.md`, secret redaction) in `server/src/device-credentials/credential-hasher.ts` and `server/src/device-credentials/device-credentials.service.ts`
- [X] T011 [P] [US1] Implement `MqttAuthorizationService` topic namespace builder (`gridaware/v1/orgs/{organizationId}/devices/{deviceKey}/{telemetry|status|availability}`) and `BrokerProvisioningAdapter` with local `MosquittoFileAdapter` in `server/src/mqtt-access/mqtt-authorization.service.ts` and `server/src/device-provisioning/mosquitto-file.adapter.ts`
- [X] T012 [US1] Implement `DevicesRepository` and `DevicesService` for `POST /api/v1/devices`, `GET /api/v1/devices/:deviceId`, `PATCH /api/v1/devices/:deviceId` (enforcing site/asset tenant hierarchy, rejecting direct status patches, and locking `Device.deviceKey` after activation per `data-model.md`) in `server/src/devices/devices.repository.ts` and `server/src/devices/devices.service.ts`
- [X] T013 [US1] Implement `DeviceProvisioningService` orchestrating `POST /api/v1/devices/:deviceId/provision` (one-time secret response + broker ACL sync + `DEVICE_CREDENTIAL_PROVISIONED` audit) and `POST /api/v1/devices/:deviceId/activate` (requiring active `DeviceCredential` + `DEVICE_ACTIVATED` audit) in `server/src/device-provisioning/device-provisioning.service.ts`
- [X] T014 [US1] Wire thin `DevicesController` endpoints (`POST /devices`, `GET /devices/:deviceId`, `PATCH /devices/:deviceId`, `POST /devices/:deviceId/provision`, `POST /devices/:deviceId/activate`, `GET /devices/:deviceId/credentials`) with RBAC guards in `server/src/devices/devices.controller.ts`

**Checkpoint**: User Story 1 is independently functional and testable as the MVP slice.

---

## Phase 4: User Story 2 - Register Sensors, Configure Metrics, and Assign to Devices (Priority: P1)

**Goal**: Allow authorized users to register `PLANNED` sensors under an asset, configure `SensorMetric` against the canonical catalog, assign at most one active publishing device per sensor, and activate the sensor.

**Independent Test**: Register a sensor under an organization's asset, configure its metric and plausibility bounds, assign it to a same-org device, reject a duplicate active assignment to a second device, and activate the sensor.

- [X] T015 [P] [US2] Create sensor and metric configuration DTOs enforcing `Sensor.sensorKey`, `Sensor.name`, `Sensor.sensorType`, `Sensor.samplingIntervalSeconds`, `Sensor.expectedReportingIntervalSeconds`, `SensorMetric.unit`, `SensorMetric.precision`, `SensorMetric.minPlausibleValue`, and `SensorMetric.maxPlausibleValue` per `data-model.md` in `server/src/sensors/dto/`
- [X] T016 [US2] Implement `SensorsRepository` and `SensorsService` for sensor creation (`PLANNED`), metadata updates (locking `Sensor.sensorKey` after activation), activation (`PLANNED -> ACTIVE`), and `PUT/GET /api/v1/sensors/:sensorId/metrics` validated via `MetricCatalogService` in `server/src/sensors/sensors.repository.ts` and `server/src/sensors/sensors.service.ts`
- [X] T017 [US2] Implement tenant-safe `DeviceSensorAssignment` creation/revocation (`POST /api/v1/devices/:deviceId/sensors/:sensorId`, `DELETE /api/v1/devices/:deviceId/sensors/:sensorId`, `GET /api/v1/devices/:deviceId/sensors`) enforcing single active assignment per sensor per `data-model.md` and emitting `DEVICE_SENSOR_ASSIGNED`/`DEVICE_SENSOR_UNASSIGNED` audit events in `server/src/sensors/sensors.service.ts` and `server/src/devices/devices.controller.ts`
- [X] T018 [US2] Wire thin `SensorsController` endpoints (`POST /sensors`, `GET /sensors/:sensorId`, `PATCH /sensors/:sensorId`, `POST /sensors/:sensorId/activate`, `GET /sensors/:sensorId/metrics`, `PUT /sensors/:sensorId/metrics`) with RBAC guards in `server/src/sensors/sensors.controller.ts`

**Checkpoint**: User Stories 1 and 2 work together to fully register and configure assets, devices, sensors, and metrics.

---

## Phase 5: User Story 3 - Manage Device Security Lifecycle (Priority: P2)

**Goal**: Enable authorized administrators to suspend, reactivate, rotate credentials (with immediate old-credential invalidation), permanently revoke, and retire devices with broker ACL sync and audit trails.

**Independent Test**: Suspend an active device (broker access denied), reactivate it, rotate credentials (old secret immediately invalid, new secret returned once), revoke it (permanent, cannot reactivate), and retire another device.

- [X] T019 [US3] Implement device lifecycle state-machine transitions (`suspend`, `reactivate`, `revoke`, `retire`) in `server/src/devices/devices.service.ts` enforcing terminal states (`REVOKED`, `RETIRED`) per `data-model.md` and updating `Device.revokedAt`
- [X] T020 [US3] Implement immediate-cutover credential rotation (`rotate-credentials`) and full credential revocation in `server/src/device-credentials/device-credentials.service.ts` and broker sync in `server/src/device-provisioning/device-provisioning.service.ts`, emitting redacted audit events (`DEVICE_SUSPENDED`, `DEVICE_REACTIVATED`, `DEVICE_CREDENTIAL_ROTATED`, `DEVICE_REVOKED`, `DEVICE_RETIRED`)
- [X] T021 [US3] Expose `POST /devices/:deviceId/suspend`, `/reactivate`, `/rotate-credentials`, `/revoke`, and `/retire` in `server/src/devices/devices.controller.ts` with strict `OWNER`/`FACILITY_MANAGER` RBAC guards

**Checkpoint**: Full device security lifecycle is enforced end-to-end.

---

## Phase 6: User Story 4 - Manage Sensor Operational Lifecycle (Priority: P2)

**Goal**: Enable authorized users (including scoped Technicians for maintenance) to transition sensors through `MAINTENANCE`, `DISABLED`, `ACTIVE`, and terminal `RETIRED` states with full audit logging.

**Independent Test**: Move an active sensor to `MAINTENANCE`, back to `ACTIVE`, to `DISABLED`, back to `ACTIVE`, and finally to `RETIRED`, verifying `RETIRED` cannot be reactivated via `PATCH`.

- [X] T022 [US4] Implement sensor lifecycle state-machine transitions (`maintenance`, `disable`, `enable`, `retire`) per `data-model.md` in `server/src/sensors/sensors.service.ts` with audit events (`SENSOR_MAINTENANCE_STARTED`, `SENSOR_MAINTENANCE_COMPLETED`, `SENSOR_DISABLED`, `SENSOR_RETIRED`)
- [X] T023 [US4] Expose `POST /sensors/:sensorId/maintenance`, `/disable`, `/enable`, and `/retire` in `server/src/sensors/sensors.controller.ts` with role and Technician-scope guards

**Checkpoint**: Sensor operational lifecycle is complete and audited.

---

## Phase 7: User Story 5 - Monitor Device & Sensor Registry, Freshness, and Audit History (Priority: P2)

**Goal**: Deliver paginated/filtered device and sensor registry lists, derived freshness evaluation (`ONLINE`, `STALE`, `OFFLINE`, `UNKNOWN`, `MAINTENANCE`), audit history endpoints, and EVARAX/WCAG 2.2 AA frontend screens.

**Independent Test**: Browse filtered/paginated device and sensor lists and detail views across roles, verifying derived freshness badges (never `HEALTHY`), `SIMULATOR` provenance labels, permission-aware CTAs, one-time secret warning modal, and all required UI states.

- [X] T024 [P] [US5] Implement pure `FreshnessEvaluator` (`ONLINE`, `STALE`, `OFFLINE`, `UNKNOWN`, `MAINTENANCE` derived from `expectedReportingIntervalSeconds` + grace factor, `lastSeenAt`/`lastReadingAt`, `lastDisconnectedAt`) in `server/src/devices/freshness.evaluator.ts`
- [X] T025 [P] [US5] Implement paginated/filtered `GET /api/v1/devices`, `GET /api/v1/sensors`, `GET /api/v1/devices/:deviceId/audit-logs`, and `GET /api/v1/sensors/:sensorId/audit-logs` with allowlisted sort keys and max `pageSize=100` in `server/src/devices/devices.controller.ts` and `server/src/sensors/sensors.controller.ts`
- [X] T026 [P] [US5] Create typed frontend API clients for assets, devices, sensors, and metric definitions in `client/lib/api/devices.ts` and `client/lib/api/sensors.ts`
- [X] T027 [P] [US5] Build Device List page (`client/app/(protected)/app/organizations/[orgSlug]/devices/page.tsx`) and Device Detail page (`client/app/(protected)/app/organizations/[orgSlug]/devices/[deviceKey]/page.tsx`) with EVARAX tokens, non-color freshness/status badges, `SIMULATOR` provenance label, one-time credential copy/download modal, and all required UI states in `client/components/devices/`
- [X] T028 [P] [US5] Build Sensor List page (`client/app/(protected)/app/organizations/[orgSlug]/sensors/page.tsx`) and Sensor Detail page (`client/app/(protected)/app/organizations/[orgSlug]/sensors/[sensorKey]/page.tsx`) with metric configuration, device assignment, maintenance/lifecycle actions, audit history, and all required UI states in `client/components/sensors/`

**Checkpoint**: Full operator UI and registry visibility are live and accessible.

---

## Phase 8: User Story 6 - Validate Device Envelope Contract and Broker Isolation with Simulator (Priority: P3)

**Goal**: Validate telemetry and status envelopes against versioned schemas and registry authorization, update `Device.lastSeenAt` on accepted authenticated messages, and verify broker ACL isolation with the local simulator.

**Independent Test**: Run the local simulator against Mosquitto with provisioned credentials, publish valid telemetry/status (updating `lastSeenAt`), and verify broker/validator rejection of cross-device topics, unassigned sensors, `NaN`/`Infinity` values, and suspended/revoked devices.

- [X] T029 [P] [US6] Implement `EnvelopeValidatorService` validating telemetry and device status JSON Schemas (`contracts/mqtt-envelope.md`: `schemaVersion`, `eventId`, finite `value`, `sentAt` skew, 64 KiB limit, active device/sensor status, active `DeviceSensorAssignment`, metric/unit match) in `server/src/mqtt-access/envelope-validator.service.ts`
- [X] T030 [US6] Wire authenticated MQTT status/telemetry test-message handler to validate envelopes and update `Device.lastSeenAt`, `Device.lastConnectedAt`, and `Device.lastDisconnectedAt` (without persisting high-volume readings) in `server/src/mqtt-access/mqtt-device-status.handler.ts`

**Checkpoint**: End-to-end simulator provisioning, broker isolation, and envelope validation are verified.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Risk-based automated test suites, contract synchronization, and quickstart verification.

- [X] T031 [P] Add unit tests for key normalization, device/sensor state machines, `FreshnessEvaluator`, `CredentialHasher`, `EnvelopeValidatorService`, and audit secret redaction in `server/src/devices/devices.service.spec.ts` and `server/src/mqtt-access/envelope-validator.service.spec.ts`
- [ ] T032 [P] Add API integration & cross-tenant/RBAC e2e tests covering all User Stories 1–5 (including `ENGINEER` credential denial and cross-org ID substitution probes) in `server/test/devices-sensors.e2e-spec.ts`
- [ ] T033 [P] Add Mosquitto broker auth & topic ACL integration tests (valid publish, unknown/suspended/revoked reject, cross-device publish/subscribe reject) in `server/test/mqtt-acl.e2e-spec.ts`
- [ ] T034 Sync `docs/contracts/openapi.yaml` and `docs/contracts/asyncapi.yaml` with implemented endpoints/topics and run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm contracts:validate`, and `quickstart.md` validation

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)** → **Phase 2 (Foundational)** (BLOCKS all user stories)
- **Phase 3 (US1 - P1 MVP)** and **Phase 4 (US2 - P1)** can run in parallel after Phase 2 (US2 assignment integrates with US1's `Device`)
- **Phase 5 (US3 - P2)** depends on US1; **Phase 6 (US4 - P2)** depends on US2
- **Phase 7 (US5 - P2)** depends on US1–US4 backend endpoints; frontend components (`T026`–`T028`) can run in parallel once API contracts are stable
- **Phase 8 (US6 - P3)** depends on US1 and US2
- **Phase 9 (Polish)** runs after desired stories complete

### Parallel Opportunities
- Within Phase 2: `T005`, `T006`, `T007`, `T008` run in parallel after `T003`–`T004`
- Within US1: `T009`, `T010`, `T011` run in parallel
- Within US5: `T024`, `T025`, `T026`, `T027`, `T028` run in parallel
- Within Phase 9: `T031`, `T032`, `T033` run in parallel

### Implementation Strategy
- **MVP First**: Complete Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) to deliver the core device + sensor + metric registry.
- **Incremental Delivery**: Add US3 & US4 (full security & operational lifecycles), then US5 (operator UI & freshness), then US6 (simulator broker validation) and Phase 9 (verification gates).
