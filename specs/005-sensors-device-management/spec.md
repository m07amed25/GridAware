# Feature Specification: Sensors & Device Management

**Feature Branch**: `005-sensors-device-management`

**Created**: 2026-11-27

**Status**: Draft

**Input**: User description: "create a spec and read GridAware Phase 5.6 Sensors & Device Management README, examples, and all project docs"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and Provision a Connected Device (Priority: P1)

An authorized organization member (such as an Owner, Facility Manager, or Engineer) registers a new physical or simulated device under their organization, optionally links it to an asset or site installation context, provisions its one-time authentication credentials, and activates the device so it can securely connect and publish measurements.

**Why this priority**: Without a registered, authenticated device identity, no simulated or physical equipment can securely connect to GridAware or attribute operational data to the correct tenant. This is the foundational capability for all downstream telemetry.

**Independent Test**: Can be fully tested by registering a device in a pending state, issuing its one-time credential, verifying the secret is never retrievable again, activating the device, and confirming that the device can authenticate and publish only to its own authorized channel.

**Acceptance Scenarios**:

1. **Given** an authenticated user with device creation permission in Organization A, **When** they register a device with a valid name, unique device key, device type, and optional asset/site belonging to Organization A, **Then** the device is created in `PENDING` status and an audit event is recorded.
2. **Given** a device in `PENDING` status and a user with credential provisioning permission, **When** the user provisions credentials for the device, **Then** the system generates a unique credential, displays the secret exactly once with a clear warning that it cannot be retrieved later, stores only a non-plaintext verifier, and configures the device's isolated publish namespace.
3. **Given** a provisioned device whose credential has been issued, **When** an authorized user views the device or its credential list afterward, **Then** only non-secret credential metadata (version, type, status, issued/expiry timestamps) is shown and the secret is never exposed.
4. **Given** a provisioned device in `PENDING` status, **When** it completes the activation workflow (verifying identity and readiness), **Then** its status transitions to `ACTIVE` and an activation audit event is recorded.
5. **Given** a user attempting to register a device linked to an asset or site from Organization B, **When** the request is submitted, **Then** the system rejects the request without leaking whether the foreign resource exists.

---

### User Story 2 - Register Sensors, Configure Metrics, and Assign to Devices (Priority: P1)

An authorized organization member registers logical sensors under an organization's assets, configures each sensor's measurement metric, unit, plausibility bounds, and expected reporting interval, and explicitly assigns sensors to the device authorized to publish their readings.

**Why this priority**: Separating assets, devices, sensors, and metrics is core to GridAware's domain model—one gateway device can publish for multiple sensors, and sensors can be planned before hardware is installed. Without explicit sensor-to-device assignment and metric configuration, incoming readings cannot be validated or attributed.

**Independent Test**: Can be fully tested by creating a planned sensor under an asset, configuring its metric from the canonical metric catalog, assigning it to an active device in the same organization, activating the sensor, and verifying that cross-tenant or unauthorized assignments are rejected.

**Acceptance Scenarios**:

1. **Given** an authenticated user with sensor creation permission and an asset in their organization, **When** they register a sensor with a unique sensor key, display name, sensor type, and expected reporting interval, **Then** the sensor is created in `PLANNED` status linked to that asset and organization.
2. **Given** a registered sensor, **When** an authorized user configures its metric using a supported metric definition and compatible unit (plus optional plausibility min/max bounds where min < max), **Then** the sensor metric configuration is saved and validated against the canonical metric catalog.
3. **Given** a sensor and a device belonging to the same organization, **When** an authorized user assigns the sensor to the device, **Then** an active device-to-sensor assignment is recorded so that only this device is authorized to publish readings for that sensor.
4. **Given** a sensor already actively assigned to Device 1, **When** a user attempts to assign the same sensor to Device 2 without unassigning it first, **Then** the system rejects the duplicate active assignment.
5. **Given** a configured sensor in `PLANNED` status, **When** an authorized user activates it, **Then** its status transitions to `ACTIVE`, its sensor key becomes immutable, and an audit event is recorded.

---

### User Story 3 - Manage Device Security Lifecycle (Suspend, Rotate, Revoke, Retire) (Priority: P2)

An authorized administrator suspends a misbehaving device, rotates credentials on a schedule or after suspected exposure, permanently revokes a compromised device, or retires decommissioned hardware while preserving full audit history.

**Why this priority**: Operational security requires immediate revocation of compromised credentials, controlled rotation without permanent lockout, and strict lifecycle enforcement so suspended, revoked, or retired devices cannot continue publishing data.

**Independent Test**: Can be fully tested by transitioning an active device through suspension, reactivation, credential rotation, revocation, and retirement, verifying at each step that broker authentication/publish access matches the lifecycle state and that invalid state transitions are blocked.

**Acceptance Scenarios**:

1. **Given** an `ACTIVE` device, **When** an authorized user suspends it, **Then** the device transitions to `SUSPENDED`, its authentication and publish access are denied, and an audit event is recorded.
2. **Given** a `SUSPENDED` device, **When** an authorized user reactivates it, **Then** it returns to `ACTIVE` status and regains publish access to its assigned namespace.
3. **Given** an `ACTIVE` device, **When** an authorized user rotates its credentials, **Then** a new credential version is issued (secret returned once), the previous credential version is transitioned to `ROTATED`/`REVOKED` per the rotation policy, and an audit event is recorded without exposing secret material.
4. **Given** an `ACTIVE` or `SUSPENDED` device, **When** an authorized user revokes it, **Then** its status permanently becomes `REVOKED`, all credentials and access are invalidated immediately, and any attempt to reactivate it via a standard update is rejected.
5. **Given** an `ACTIVE` or `SUSPENDED` device, **When** an authorized user retires it, **Then** its status becomes `RETIRED`, it can no longer authenticate or publish, and its historical metadata and audit trail remain preserved.

---

### User Story 4 - Manage Sensor Operational Lifecycle (Maintenance, Disable, Retire) (Priority: P2)

An authorized engineer, facility manager, or scoped technician places a sensor into maintenance during calibration or repair, disables a faulty sensor, re-enables it when ready, or retires it when decommissioned, ensuring non-active sensors are never mistaken for healthy equipment.

**Why this priority**: Maintenance teams need honest visibility into whether a sensor is under maintenance, disabled, or retired so missing or quarantined readings are never misread as normal asset health.

**Independent Test**: Can be fully tested by moving an active sensor to `MAINTENANCE`, back to `ACTIVE`, to `DISABLED`, back to `ACTIVE`, and finally to `RETIRED`, confirming that retired sensors cannot be reactivated through generic edits and that all transitions are audited.

**Acceptance Scenarios**:

1. **Given** an `ACTIVE` sensor, **When** an authorized user (including a Technician within their assigned scope) places it into maintenance, **Then** the sensor status becomes `MAINTENANCE` and an audit event is recorded.
2. **Given** a sensor in `MAINTENANCE`, **When** maintenance is completed by an authorized user, **Then** the sensor returns to `ACTIVE` status and an audit event is recorded.
3. **Given** an `ACTIVE` sensor, **When** an authorized user disables it, **Then** the sensor status becomes `DISABLED` and it is clearly distinguished from active sensors in all views.
4. **Given** a sensor in any non-retired state, **When** an authorized user retires it, **Then** its status becomes `RETIRED` and subsequent attempts to reactivate it through a generic update are rejected.

---

### User Story 5 - Monitor Device & Sensor Registry, Freshness, and Audit History (Priority: P2)

Authorized organization members browse, search, filter, and inspect devices and sensors across their organization, view derived connectivity and freshness states (`ONLINE`, `STALE`, `OFFLINE`, `UNKNOWN`, `MAINTENANCE`), inspect safe configuration and topic namespaces, and review the audit history of security and configuration changes.

**Why this priority**: Visibility into device connectivity, sensor freshness, and configuration history is essential for operators to trust incoming data and troubleshoot stale or disconnected sources—without conflating connectivity with physical asset health.

**Independent Test**: Can be fully tested by viewing paginated, filtered device and sensor lists and detail views across different roles (Owner, Engineer, Technician, Viewer), verifying permission-aware actions, derived freshness states, explicit simulator provenance, and complete empty/loading/error/forbidden UI states.

**Acceptance Scenarios**:

1. **Given** an authenticated user with read permission, **When** they open the device list or sensor list and apply filters (status, type, site, asset, search, last-seen range), **Then** only records belonging to their active organization are returned with consistent pagination and sorting.
2. **Given** a device or sensor with a configured expected reporting interval and a `lastSeenAt` / `lastReadingAt` timestamp, **When** a user views its status, **Then** the system displays an accurate derived freshness state (`ONLINE`, `STALE`, `OFFLINE`, `UNKNOWN`, or `MAINTENANCE`) that is visually and semantically distinct from physical asset health.
3. **Given** a device that has never connected or a sensor that has never reported, **When** a user views its details, **Then** it is explicitly shown as `UNKNOWN` / never connected rather than `ONLINE` or `HEALTHY`.
4. **Given** a Viewer or Technician without administrative permissions, **When** they view device or sensor screens, **Then** unauthorized actions (such as provisioning, rotating, suspending, or revoking) are hidden/disabled in the UI and strictly rejected if invoked directly.
5. **Given** a simulated device, **When** it is displayed in lists, detail views, or status records, **Then** its `SIMULATOR` provenance is explicitly labeled so synthetic data is never mistaken for physical field hardware.

---

### User Story 6 - Validate Device Envelope Contract and Broker Isolation with Simulator (Priority: P3)

A local simulator device authenticates using its provisioned per-device credentials, publishes test status and telemetry envelopes to its authorized topic namespace, and the system verifies identity binding, topic isolation, sensor assignment, and envelope validity—proving end-to-end readiness for the subsequent telemetry ingestion phase.

**Why this priority**: Exercising the full registration, provisioning, and broker-isolation flow with the simulator validates that tenant and device boundaries work in practice before building high-volume telemetry persistence.

**Independent Test**: Can be fully tested by running an end-to-end simulator workflow: register device, provision credentials, register and assign sensors, activate device, connect simulator, publish valid and invalid/cross-device messages, and confirm valid messages update `lastSeenAt` while unauthorized or cross-device publishes are rejected.

**Acceptance Scenarios**:

1. **Given** an `ACTIVE` simulated device with provisioned credentials and assigned sensors, **When** it connects and publishes a valid status or test telemetry envelope to its own topic namespace, **Then** the broker accepts the message and the device's `lastSeenAt` is updated upon accepted authenticated receipt.
2. **Given** an `ACTIVE` Device A, **When** it attempts to publish to Device B's topic namespace or subscribe to another device's telemetry topic, **Then** the broker rejects the operation.
3. **Given** a `SUSPENDED`, `REVOKED`, `RETIRED`, or unknown device, **When** it attempts to connect to the broker, **Then** the connection is rejected.
4. **Given** an `ACTIVE` device publishing a telemetry envelope containing an unassigned `sensorKey`, an invalid/non-finite numeric value (`NaN`, `Infinity`), an unsupported `metricKey`/unit, or a mismatched `deviceKey`, **When** the envelope is validated, **Then** it is deterministically rejected with an observable validation reason.

---

### Edge Cases

- **Lost one-time credential**: If an administrator loses a newly provisioned device secret after closing the provisioning dialog, the system cannot recover it; the administrator must rotate credentials to issue a new secret.
- **Cross-tenant ID substitution**: Supplying a valid asset ID, site ID, device ID, or sensor ID from another organization in any create, update, assignment, or query operation must be rejected without revealing whether the foreign ID exists.
- **Site/asset hierarchy mismatch**: If both a site and an asset are supplied when registering or updating a device, the asset must belong to that site (or a building within that site); mismatches must be rejected.
- **Direct status bypass**: Attempting to set a device to `ACTIVE` or reactivate a `REVOKED`/`RETIRED` device or `RETIRED` sensor via a generic metadata update must be rejected; all lifecycle transitions must go through explicit state-machine actions.
- **Partial provisioning failure**: If database credential creation succeeds but broker access synchronization fails (or vice versa), the system must leave the device in a recoverable state and support reconciliation rather than leaving orphaned active credentials.
- **Timestamp skew & retained status**: Envelopes with timestamps outside the allowed future/past skew window must be rejected; retained broker status messages must carry their original timestamp so stale retained state is never mistaken for a fresh live heartbeat.
- **Last Will / unexpected disconnect**: An unexpected disconnect signal indicates lost broker connectivity only and must never be treated as proof of physical equipment failure.
- **Non-active sensor readings**: Telemetry referencing a `PLANNED`, `MAINTENANCE`, `DISABLED`, or `RETIRED` sensor must not be silently accepted as healthy operational data; it must be rejected or quarantined with an observable reason.

## Requirements *(mandatory)*

### Functional Requirements

#### Device Registry & Lifecycle
- **FR-001**: System MUST allow authorized users (`devices.create`) to register a device under their active organization with a display name, unique organization-scoped `deviceKey` (normalized lowercase identifier), `deviceType` (`GATEWAY`, `SIMULATOR`, `EDGE_CONTROLLER`, `OTHER`), and optional metadata (description, serial number, manufacturer, model, firmware version, primary asset, and site installation context).
- **FR-002**: System MUST create newly registered devices in `PENDING` status and prevent `PENDING` devices from publishing production telemetry until credentials are provisioned and the activation workflow succeeds.
- **FR-003**: System MUST enforce explicit device lifecycle transitions (`PENDING -> ACTIVE`, `ACTIVE <-> SUSPENDED`, `ACTIVE/SUSPENDED -> REVOKED`, `ACTIVE/SUSPENDED -> RETIRED`) and reject invalid transitions or direct status overrides via generic metadata updates.
- **FR-004**: System MUST treat `deviceKey` as immutable once a device has been activated.
- **FR-005**: System MUST permanently prevent `REVOKED` and `RETIRED` devices from being reactivated through ordinary update or reactivation workflows, while preserving their historical metadata and audit trail.

#### Device Credentials & Security
- **FR-006**: System MUST allow authorized users (`device_credentials.provision`) to issue unique per-device credentials (never shared across devices or with human user accounts) and return the plaintext secret exactly once in the provisioning response.
- **FR-007**: System MUST store only a non-plaintext cryptographic verifier/hash or certificate metadata/fingerprint for every `DeviceCredential`; plaintext secrets MUST NEVER be stored, returned by read endpoints, or written to logs, error messages, or audit payloads.
- **FR-008**: System MUST support credential rotation (`devices.rotate_credentials`) by issuing a new versioned credential and invalidating the previous credential version according to a controlled rotation sequence, as well as immediate revocation (`devices.revoke`) on suspected compromise.
- **FR-009**: System MUST synchronize device credential and topic access policies with the messaging broker so that each active device can publish only to its own versioned topic namespace (`telemetry`, `status`, `availability`) and cannot publish or subscribe to another device's or organization's namespace.
- **FR-010**: System MUST deny broker authentication and publish access to unknown, `PENDING` (for production telemetry), `SUSPENDED`, `REVOKED`, and `RETIRED` devices.

#### Sensor Registry, Metrics & Assignments
- **FR-011**: System MUST allow authorized users (`sensors.create`) to register a logical sensor under an asset belonging to their active organization, with a unique organization-scoped `sensorKey`, display name, sensor type, and optional installation metadata, sampling interval, and expected reporting interval, starting in `PLANNED` status.
- **FR-012**: System MUST provide a seeded canonical `MetricDefinition` catalog (including `temperature`, `vibration_velocity`, `voltage`, `current`, `frequency`, `pressure`, `flow_rate`, `power`, `energy`) defining each metric's canonical unit, supported units, dimension, and value type.
- **FR-013**: System MUST allow authorized users (`sensors.update`) to configure a sensor's `SensorMetric` mapping against the canonical metric catalog, validating unit compatibility and ensuring plausibility bounds (`minPlausibleValue`, `maxPlausibleValue`) are finite with `min < max` when both are provided.
- **FR-014**: System MUST allow authorized users (`sensors.update`) to assign a sensor to a device within the same organization and unassign it, enforcing at most one active publishing device per sensor in the MVP and preventing cross-organization assignments.
- **FR-015**: System MUST enforce explicit sensor lifecycle transitions (`PLANNED -> ACTIVE`, `ACTIVE <-> MAINTENANCE`, `ACTIVE <-> DISABLED`, and any non-retired state `-> RETIRED`), make `sensorKey` immutable after activation, and reject reactivation of `RETIRED` sensors via generic updates.

#### Tenant Isolation, RBAC & Auditability
- **FR-016**: System MUST derive the active organization context exclusively from the authenticated user's membership (for human requests) or the broker-authenticated device identity (for device messages), and MUST reject any cross-tenant asset, site, device, or sensor linkage without leaking resource existence.
- **FR-017**: System MUST enforce role-based permissions on all device, credential, and sensor operations using the canonical RBAC permission catalog (restricting credential provisioning/rotation and device suspension/revocation to authorized roles, and scoping Technician access to assigned scope only).
- **FR-018**: System MUST record tamper-resistant, redacted audit events for all security-sensitive device, credential, sensor, and assignment lifecycle actions (including actor type, actor ID, organization ID, action, target type/ID, timestamp, and correlation/request ID).

#### Freshness Semantics & Envelope Validation
- **FR-019**: System MUST derive and display device and sensor connectivity/freshness states (`ONLINE`, `STALE`, `OFFLINE`, `UNKNOWN`, `MAINTENANCE`) from `lastSeenAt`, `lastReadingAt`, broker connection/disconnect signals, and each entity's configured expected reporting interval plus grace factor—never conflating connectivity with physical asset health.
- **FR-020**: System MUST validate device telemetry and status envelopes against versioned contracts, checking schema version, finite numeric values, bounded payload/array sizes, timestamp skew, broker-authenticated device identity match, active device/sensor status, active device-to-sensor assignment, and metric/unit compatibility.
- **FR-021**: System MUST NOT introduce any physical equipment actuation, control command channels, or setpoint modification capabilities.

#### User Interface & Accessibility
- **FR-022**: System MUST provide permission-aware Device List, Device Detail, Sensor List, and Sensor Detail views supporting search, filtering, pagination, sorting, explicit `SIMULATOR` provenance labeling, one-time secret copy/download warnings, and all required UI states (loading, empty, error/retry, forbidden, never connected, stale/offline, planned, maintenance, disabled/retired) following the EVARAX design system and WCAG 2.2 AA accessibility standards (never conveying status by color alone).

### Key Entities *(include if feature involves data)*

- **Device**: A physical or simulated connected endpoint (gateway, simulator, edge controller) owned by one Organization, optionally associated with a Site and primary Asset. Carries a unique organization-scoped `deviceKey`, `deviceType`, lifecycle `status`, hardware/firmware metadata, and connectivity timestamps (`lastSeenAt`, `lastConnectedAt`, `lastDisconnectedAt`).
- **DeviceCredential**: A versioned authentication credential belonging to one Device and Organization. Carries `credentialVersion`, `credentialType` (password or certificate), non-plaintext `secretHash`/fingerprint, lifecycle `status` (`ACTIVE`, `ROTATED`, `REVOKED`, `EXPIRED`), and issuance/expiry/revocation timestamps.
- **Sensor**: A logical measurement source owned by one Organization and attached to exactly one Asset. Carries a unique organization-scoped `sensorKey`, `sensorType`, lifecycle `status`, installation metadata, `samplingIntervalSeconds`, `expectedReportingIntervalSeconds`, and `lastReadingAt`.
- **MetricDefinition**: A platform-level reference catalog entry defining a canonical measurement type (`key`, `displayName`, `dimension`, `canonicalUnit`, `supportedUnits`, `valueType`, `isActive`).
- **SensorMetric**: The configuration linking a Sensor to its MetricDefinition, specifying unit, optional display precision, optional plausibility bounds (`minPlausibleValue`, `maxPlausibleValue`), and primary flag.
- **DeviceSensorAssignment**: The explicit authorization record binding a Sensor to the Device permitted to publish its readings within the same Organization, tracking assignment status (`ACTIVE`, `REVOKED`) and timestamps.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized user can register a device, provision its one-time credentials, register and configure its sensors, assign them to the device, and activate the device in under 5 minutes without manual database intervention.
- **SC-002**: 100% of cross-tenant access or linking attempts (across device creation, sensor registration, device-sensor assignment, and broker topic publishing) are blocked with zero data leakage.
- **SC-003**: 100% of device credential read operations, audit log entries, and error responses contain zero plaintext secrets or secret verifiers.
- **SC-004**: 100% of unauthorized broker connection or publish attempts (unknown, suspended, revoked, retired, or cross-device topic publish/subscribe) are rejected at the broker/authorization boundary.
- **SC-005**: 100% of device and sensor lifecycle state transitions conform to the defined state machines, with every security-sensitive mutation producing a corresponding audit record.
- **SC-006**: 100% of device and sensor UI screens render explicit, accessible states (loading, empty, error, forbidden, never connected, stale/offline, maintenance, disabled/retired) with non-color status indicators and clear `SIMULATOR` provenance labels.
- **SC-007**: A simulated generator device completes the full end-to-end registration, credential provisioning, activation, broker connection, and validated test-envelope publication flow in the local development environment.

## Assumptions

- **Existing Phase 5.1–5.5 Foundations**: Authentication, Organizations, RBAC, Sites & Buildings, and Assets exist (or where Assets are not yet implemented in code, a clearly marked development boundary/stub or prerequisite phase will be respected without weakening tenant/RBAC enforcement).
- **Simulator-First MVP**: Initial devices are simulated by the Python infrastructure simulator; the domain model and security boundaries are designed to support physical gateways later without schema redesign.
- **Single Active Publisher per Sensor**: In the MVP, a device may publish for many sensors, while each sensor has at most one active publishing device at a time.
- **Single Active Metric per Sensor**: In the MVP, each sensor maps to one primary active metric definition from the seeded canonical catalog; customer-defined custom metrics and multi-channel sensors are deferred.
- **Credential Provisioning Role Policy**: By default, `Owner` and `Facility Manager` roles may provision/rotate credentials and suspend/revoke devices; `Engineer` credential issuance is restricted by default until operational procedures are established; `Technician` access is restricted to assigned scope only.
- **Scope Boundary (No Telemetry Persistence Pipeline)**: High-volume telemetry storage, time-series charts, anomaly detection, risk scoring, ML serving, industrial field protocols (Modbus/OPC UA), remote firmware updates, and physical equipment control are explicitly out of scope for this phase and belong to subsequent phases.
- **Local vs. Production Broker Auth**: Local development may use a per-device credential mechanism (such as a local password/ACL file) with anonymous access disabled outside isolated local dev, while staging/production requires TLS and a reviewed per-device auth/ACL service.
