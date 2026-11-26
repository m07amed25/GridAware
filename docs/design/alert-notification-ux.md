# GridAware — Alert and Notification UX Specification

**Document version:** 1.0  
**Status:** Proposed specification for design and implementation  
**Scope:** Threshold alerts, anomaly events, operational incidents, notifications, acknowledgement, escalation  
**Related documents:** `user-flows.md`, `screen-inventory.md`, `interaction-specifications.md`, `data-visualization-guidelines.md`, `design-system.md`

---

## 1. Purpose

GridAware handles operational signals that may require review or action. The interface must help users distinguish an informational event, an alert requiring acknowledgement, and an incident requiring an operational workflow. These concepts must not be collapsed into a single generic red notification.

This specification defines alert taxonomy, severity, lifecycle, notification channels, inbox behavior, escalation UX, deduplication, quieting, and failure states.

## 2. Domain distinction

| Object          | Definition                                                          | Example                                                   |
| --------------- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| Telemetry event | A received measurement or state update                              | Generator temperature = 86.5 °C                           |
| Anomaly event   | A rule/model identifies unusual behavior                            | Temperature trend differs from learned baseline           |
| Alert           | A user-facing attention item generated from a rule/event            | Warning: generator temperature above configured threshold |
| Incident        | A managed operational issue with assignment and resolution workflow | Investigate Generator-01 overheating                      |
| Notification    | A delivery/inbox message informing a user of an event or action     | You were assigned an incident                             |

An anomaly event does not automatically become an incident. Incident creation follows configurable policy and severity/duplication rules.

## 3. Alert taxonomy

Recommended categories:

- Threshold exceeded.
- Anomaly detected.
- Device offline.
- Telemetry stale or incomplete.
- Asset state changed.
- Maintenance due/overdue.
- Work order assigned or updated.
- Incident escalated or reassigned.
- Simulator scenario event (demo only).

Each alert includes category, severity, title, concise description, affected asset/site, occurred-at time, last-updated time, source, and a clear next action.

## 4. Severity model

Severity is an operational classification. It is not equivalent to the ML anomaly score or failure probability.

| Severity      | Meaning                                            | Expected UX                                                                |
| ------------- | -------------------------------------------------- | -------------------------------------------------------------------------- |
| Informational | Useful context; no immediate action expected       | Normal inbox item; no disruptive interruption                              |
| Low           | Review when convenient                             | Badge and notification center item                                         |
| Warning       | Attention required within the operational workflow | Highlighted alert; acknowledgement may be required by policy               |
| High          | Prompt investigation required                      | Strong visual treatment and configured notification delivery               |
| Critical      | Urgent operational review required                 | Persistent prominent alert until acknowledged/resolved according to policy |

Severity thresholds and response-time expectations must be configured per organization/site policy. Do not hardcode a universal response SLA in the UI.

## 5. Alert lifecycle

Proposed lifecycle for an alert:

```text
OPEN → ACKNOWLEDGED → RESOLVED
  └───────────────→ SUPPRESSED (policy-controlled)
```

Clarifications:

- `OPEN`: eligible for review/action.
- `ACKNOWLEDGED`: a user has accepted responsibility for reviewing it; this does not mean the underlying condition is fixed.
- `RESOLVED`: the condition has cleared or the event has been handled according to the configured rule.
- `SUPPRESSED`: duplicate/noisy notifications are intentionally muted under an authorized policy; the underlying event remains auditable.

Alert resolution must not automatically close a linked incident unless the incident workflow explicitly permits it.

## 6. Notification center

### Layout

- Header: Notification Center title, unread count, mark-all-read action (if permission allows).
- Filters: All, Unread, Alerts, Incidents, Assignments, System.
- List row: severity/category icon, title, concise summary, affected asset/site, timestamp, unread indicator.
- Detail: full description, source event, related asset/incident, actions, audit trail where authorized.

### Sorting

Default ordering is newest/highest-priority according to product decision. The chosen ordering must be consistent and clearly described. Critical operational items should not disappear solely because a lower-severity item arrived later.

### Read vs acknowledged

`Read` is a personal inbox state. `Acknowledged` is an operational state. They must be stored and displayed separately. Opening an alert may mark it read but must not automatically acknowledge it.

## 7. Acknowledgement UX

- The action label must be `Acknowledge` or a context-specific equivalent.
- Show the current assignee/acknowledger and acknowledgement time.
- Require a reason/comment only when policy or severity demands it.
- Prevent users without permission from acknowledging.
- If already acknowledged by another user, explain the current owner and permitted next action.
- Acknowledgement must not imply that the condition has been corrected.

## 8. Incident creation and linking

When an alert can create an incident:

- Explain why incident creation is recommended or required.
- Show existing open incidents for the same asset/event family to reduce duplicates.
- Provide a clear link between alert, anomaly event, risk assessment, and incident.
- Preserve the original timestamps and source IDs.
- If an incident already exists, route the user to it or update its event history instead of creating unnecessary duplicates.
- Make automatic incident creation policy visible to administrators.

## 9. Escalation

Escalation is policy-driven and must show:

- Trigger condition (unacknowledged duration, severity, repeated occurrence, or configured rule).
- Escalation destination (role/team/user, not necessarily a personal name in the UI).
- Escalation history and timestamps.
- Current owner.
- Next expected action.

The product must not claim an external notification was delivered unless the delivery provider confirms it. Show states such as `Queued`, `Sent`, `Delivered` (only if supported), `Failed`, and `Retrying` accurately.

## 10. Notification channels

Potential channels may include in-app, email, and later integrations. MVP should prioritize in-app notifications and a dependable notification record. Email may be added when provider integration is implemented.

For every channel:

- User preferences must not override mandatory critical delivery policies unless explicitly permitted by organization policy.
- Delivery attempts must be auditable.
- Failed delivery must be visible to administrators.
- Avoid exposing sensitive operational details in email subject lines or lock-screen previews where privacy matters.

## 11. Duplicate and noisy alert handling

The UX should reflect backend deduplication and grouping behavior:

- Similar events may be grouped under one alert thread.
- Grouped alerts show count and most recent occurrence.
- The user can inspect individual occurrences.
- Acknowledgement and resolution semantics for grouped alerts must be explicit.
- Suppression rules must show scope, duration, reason, and actor.
- Suppression must not erase the original event history.

## 12. Alert detail content

Required content:

1. Alert title and severity.
2. Status (open/acknowledged/resolved/suppressed).
3. Asset and site context.
4. Trigger time and last occurrence.
5. Rule/model source and version when appropriate.
6. Trigger reading, unit, and threshold/reference used.
7. Data freshness and quality.
8. Supporting chart/time window.
9. Related anomalies and incidents.
10. Recommended next action, clearly labeled as guidance rather than certainty.
11. Activity/audit timeline.

## 13. Failure and edge states

- Notification delivery failed.
- Alert already acknowledged.
- Alert resolved while user is viewing it.
- Linked asset was archived.
- User lost access to the site.
- Duplicate event received.
- Alert source data is stale or incomplete.
- Notification preference changed during a queued delivery.

Each state must explain what happened and what the user can do next.

## 14. Simulator-specific treatment

Simulation alerts must display `SIMULATED` / `DEMO DATA` in list and detail views. Demo alerts must be visually distinct from live field-device alerts without confusing severity meaning. Provide a demo filter and prevent simulated incidents from appearing in production operational reports unless the report explicitly includes demo data.

## 15. Acceptance criteria

- [ ] Telemetry, anomaly event, alert, incident, and notification are distinct concepts.
- [ ] Severity has documented semantics and visual labels.
- [ ] Read and acknowledge states are separate.
- [ ] Acknowledgement does not imply resolution.
- [ ] Alert-to-incident links preserve source history.
- [ ] Duplicate grouping is understandable and auditable.
- [ ] Delivery status is only claimed when confirmed by the channel provider.
- [ ] Critical items remain discoverable until handled according to policy.
- [ ] Simulated alerts are clearly identified and filterable.
- [ ] Permission and failure states are designed.
