# ADR-0007: Use Versioned Device-Scoped MQTT Topics and QoS 1

**Status:** Proposed · **Date:** 2026-11-26 · **Owners:** Backend / IoT Engineering

## Context

Telemetry needs authenticated producer identity and tenant isolation. The domain model distinguishes Asset (equipment), Sensor (measurement point), and Device (message producer/gateway). A device may publish readings for multiple authorized sensors.

## Decision

Use `gridaware/v1/orgs/{organizationId}/sites/{siteId}/devices/{deviceId}/telemetry` and sibling `/status` and `/events` topics. Use QoS 1 as the MVP starting point, do not retain telemetry, and restrict each device credential to exact topic scope. Verify topic and payload IDs against Device/Sensor registry records.

## Consequences

Benefits: explicit device ownership, versionable contract, multi-sensor support, at-least-once delivery. Costs: duplicates are expected; broker/client persistence and acknowledgement behavior must be tested. QoS 1 does not mean the database committed.

## Alternatives

QoS 0 is lower overhead but weaker delivery. QoS 2 adds protocol cost but still does not guarantee exactly-once business processing. Asset-scoped topics do not represent the actual producer identity as cleanly.

## Validation

Test duplicate delivery, broker/subscriber restart, revoked credentials, cross-tenant topic publishing, late events, and exact Mosquitto/client versions.
