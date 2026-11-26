# GridAware — Database Entity Relationship Diagram

**Document ID:** ARC-DB-ERD-001  
**Version:** 0.1  
**Status:** Proposed logical ERD  
**Notation:** Mermaid ER diagram; not an executable migration

---

## 1. Reading the ERD

The diagram is a logical relationship map. It intentionally separates domains and omits some implementation details such as indexes, enum definitions, audit columns, and composite tenant-safety constraints. Those are described in the Entity Catalog and Multi-Tenancy documents.

`Organization` is the tenant boundary. A User is global; its organization access is represented by Membership.

## 2. Identity, Organization, and Facility Model

```mermaid
erDiagram
    USER ||--o{ MEMBERSHIP : joins
    ORGANIZATION ||--o{ MEMBERSHIP : grants_access
    ORGANIZATION ||--o{ SITE : owns
    SITE ||--o{ BUILDING : contains
    ORGANIZATION ||--o{ INVITATION : issues
    USER ||--o{ AUDIT_LOG : performs
    ORGANIZATION ||--o{ AUDIT_LOG : scopes

    USER {
      uuid id PK
      string email UK
      string displayName
      datetime createdAt
    }
    ORGANIZATION {
      uuid id PK
      string name
      string slug UK
      string status
    }
    MEMBERSHIP {
      uuid id PK
      uuid organizationId FK
      uuid userId FK
      string role
      string status
    }
    SITE {
      uuid id PK
      uuid organizationId FK
      string code
      string name
      string timezone
    }
    BUILDING {
      uuid id PK
      uuid organizationId FK
      uuid siteId FK
      string code
      string name
    }
    INVITATION {
      uuid id PK
      uuid organizationId FK
      string email
      string role
      string status
    }
    AUDIT_LOG {
      uuid id PK
      uuid organizationId FK
      uuid actorUserId FK
      string action
      string entityType
      datetime occurredAt
    }
```

## 3. Infrastructure and Telemetry Model

```mermaid
erDiagram
    ORGANIZATION ||--o{ ASSET : owns
    SITE ||--o{ ASSET : hosts
    BUILDING o|--o{ ASSET : locates
    ASSET_TYPE ||--o{ ASSET : classifies
    ORGANIZATION ||--o{ DEVICE : owns
    SITE ||--o{ DEVICE : locates
    ASSET ||--o{ SENSOR : monitored_by
    DEVICE o|--o{ SENSOR : reads
    METRIC_DEFINITION ||--o{ SENSOR : measures
    SENSOR ||--o{ SENSOR_THRESHOLD : configured_with
    DEVICE ||--o{ TELEMETRY_EVENT : publishes
    SIMULATION_RUN o|--o{ TELEMETRY_EVENT : generates
    TELEMETRY_EVENT ||--|{ TELEMETRY_READING : contains
    SENSOR ||--o{ TELEMETRY_READING : measured_by
    ASSET ||--o{ TELEMETRY_READING : describes

    ASSET {
      uuid id PK
      uuid organizationId FK
      uuid siteId FK
      uuid buildingId FK
      uuid assetTypeId FK
      string assetCode
      string name
      string criticality
      string status
    }
    DEVICE {
      uuid id PK
      uuid organizationId FK
      uuid siteId FK
      string deviceCode
      string kind
      string status
    }
    SENSOR {
      uuid id PK
      uuid organizationId FK
      uuid assetId FK
      uuid deviceId FK
      uuid metricDefinitionId FK
      string sensorCode
      string status
    }
    METRIC_DEFINITION {
      uuid id PK
      string code UK
      string canonicalUnit
      string dimension
    }
    SENSOR_THRESHOLD {
      uuid id PK
      uuid organizationId FK
      uuid sensorId FK
      float warningMin
      float warningMax
      float criticalMin
      float criticalMax
      datetime effectiveFrom
    }
    SIMULATION_RUN {
      uuid id PK
      uuid organizationId FK
      uuid assetId FK
      uuid deviceId FK
      string scenarioCode
      string status
    }
    TELEMETRY_EVENT {
      uuid id PK
      uuid organizationId FK
      uuid deviceId FK
      uuid simulationRunId FK
      string sourceEventId
      datetime observedAt
      datetime receivedAt
    }
    TELEMETRY_READING {
      uuid id PK
      uuid organizationId FK
      uuid telemetryEventId FK
      uuid sensorId FK
      uuid assetId FK
      string metricCode
      float value
      string unit
      datetime observedAt
      string quality
    }
```

## 4. Intelligence and Operations Model

```mermaid
erDiagram
    ASSET ||--o{ ANOMALY_EVENT : experiences
    SENSOR o|--o{ ANOMALY_EVENT : relates_to
    MODEL_VERSION o|--o{ ANOMALY_EVENT : detects
    ASSET ||--o{ PREDICTION : receives
    MODEL_VERSION ||--o{ PREDICTION : produces
    ASSET ||--o{ RISK_ASSESSMENT : assessed_by
    ANOMALY_EVENT o|--o{ INCIDENT : may_trigger
    ASSET ||--o{ INCIDENT : affected_by
    INCIDENT ||--o{ INCIDENT_EVENT : records
    INCIDENT o|--o{ WORK_ORDER : may_create
    ASSET ||--o{ WORK_ORDER : maintained_by
    ASSET ||--o{ MAINTENANCE_SCHEDULE : has
    ASSET ||--o{ MAINTENANCE_RECORD : records
    WORK_ORDER o|--o{ MAINTENANCE_RECORD : fulfilled_by
    USER ||--o{ NOTIFICATION : receives
    ORGANIZATION ||--o{ NOTIFICATION : scopes
    OUTBOX_EVENT {
      uuid id PK
      uuid organizationId FK
      string aggregateType
      uuid aggregateId
      string eventType
      string status
      datetime createdAt
    }
    INCIDENT {
      uuid id PK
      uuid organizationId FK
      uuid siteId FK
      uuid assetId FK
      uuid sourceAnomalyId FK
      string severity
      string status
      uuid assignedToUserId FK
    }
    INCIDENT_EVENT {
      uuid id PK
      uuid incidentId FK
      uuid actorUserId FK
      string eventType
      json metadata
      datetime occurredAt
    }
    WORK_ORDER {
      uuid id PK
      uuid organizationId FK
      uuid assetId FK
      uuid incidentId FK
      string workOrderNumber
      string status
      string priority
    }
```

## 5. Key Relationship Notes

### Organization scoping

All tenant-owned models shown with `organizationId` must be scoped by the authenticated organization context. Organization ownership is repeated on high-volume or tenant-sensitive records where it helps enforce constraints and filter queries efficiently.

### Site and Building

An Asset belongs to one Site. `buildingId` is optional. If present, the selected Building must belong to the same Site and Organization as the Asset. The write path must validate this; the database implementation should use composite constraints where practical.

### Device and Sensor

A Device is a message producer/gateway. A Sensor is a measurement source. One Device may publish for multiple Sensors. A Sensor may be unassigned during provisioning, but a reading is accepted only when the authenticated Device is authorized to publish for that Sensor.

### Event and Reading

One Telemetry Event represents one received envelope and has one stable source event identity. It may contain multiple Telemetry Readings. Event-level uniqueness handles duplicate message delivery; reading-level constraints prevent duplicate samples within the same envelope.

### Anomaly and Incident

An Anomaly Event is detection evidence. An Incident is a workflow case. Policies decide whether to create, attach to, or deduplicate an Incident based on one or more anomaly events.

### Incident and Work Order

An Incident may have zero or more Work Orders depending on operational policy. A Work Order can also be created independently for preventive maintenance.

## 6. Logical ERD Limitations

This ERD does not yet express:

- Composite foreign keys required to guarantee tenant/site consistency at database level.
- Partial/covering indexes.
- Unique constraints for deduplication keys.
- Exact enum values and allowed transitions.
- Partitioning or retention implementation.
- RLS policies.
- Foreign-key delete/update behavior.

These must be resolved in the schema design and migrations. A visually correct ERD alone is not sufficient database validation.
