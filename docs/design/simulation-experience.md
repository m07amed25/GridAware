# GridAware — Simulator Experience Specification

**Document version:** 1.0  
**Status:** Proposed MVP UX specification  
**Baseline:** Simulator-only initial release; simulated generator is first end-to-end asset  
**Related documents:** `user-flows.md`, `screen-inventory.md`, `component-catalog.md`, `alert-notification-ux.md`, `data-visualization-guidelines.md`, `content-design-and-terminology.md`

---

## 1. Purpose

The initial GridAware release uses a simulator as the data source. The simulator must be treated as a first-class product capability for demonstrations, development, QA, and reproducible AI experiments. It must also be unmistakably separated from real field-device telemetry.

The simulator is not a physical equipment control interface. It generates synthetic data and simulated events. Buttons must use terms such as `Start simulation` and `Inject simulated fault`, never `Start generator` or `Power on equipment`.

## 2. Goals

- Demonstrate a complete telemetry-to-maintenance workflow without physical equipment.
- Generate deterministic, repeatable scenarios for product demos and automated tests.
- Support normal operation and controlled fault injection.
- Make simulated data source and state visible at all times.
- Allow authorized users to inspect run configuration and generated events.
- Keep simulator data separable from production field-device data and customer analytics.

## 3. Non-goals

- Sending commands to real equipment.
- Controlling PLCs, generators, or industrial machinery.
- Claiming that synthetic behavior proves real-world model performance.
- Providing unrestricted arbitrary code execution through scenario configuration.
- Simulating every asset category in the first release.

## 4. Access and placement

The simulator appears under a clearly named `Simulation` or `Simulator` section, available only to authorized roles such as Platform Admin, Organization Owner, or Facility Manager in demo/development contexts.

The interface must explain that the simulator creates demonstration data. If organizations have their own data environments, simulator access should be configurable and default to disabled outside the designated demo/staging contexts until a safe policy is defined.

## 5. Simulator screen anatomy

### Header

- Page title: `Simulator` or `Simulation Console`.
- Persistent `SIMULATED DATA` badge.
- Current organization/site context.
- Current run ID and run status.

### Scenario configuration

- Asset selector (initially simulated Generator-01).
- Scenario selector.
- Scenario description.
- Duration or run mode.
- Simulation speed presets.
- Seed/reproducibility identifier where supported.
- Start button.

### Controls

- Start.
- Pause.
- Resume.
- Stop.
- Reset/new run (with clear confirmation if data cleanup is involved).
- Fault injection, available only for supported scenarios and authorized roles.

### Live run view

- Current run state.
- Elapsed simulation time.
- Selected scenario.
- Metrics being generated.
- Latest measurements.
- Generated event log.
- Link to the asset monitoring page.

### Run history

- Run ID.
- Scenario.
- Start/end time.
- Initiating user.
- Seed/configuration summary.
- Outcome (completed, stopped, failed).
- Link to generated data and events.

## 6. Initial scenarios

| Scenario                | Purpose                                             | Expected simulated behavior                            | Expected product UX                                           |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| Normal operation        | Baseline and demo                                   | Stable measurements within configured simulated range  | Operational state and stable charts                           |
| Progressive overheating | Demonstrate gradual deterioration                   | Temperature trend rises over time                      | Threshold event and anomaly evidence when configured          |
| Abnormal vibration      | Demonstrate mechanical signal change                | Vibration pattern departs from baseline                | Vibration anomaly marker and event details                    |
| Cooling degradation     | Demonstrate correlated metrics                      | Cooling-related values change and temperature may rise | Multi-metric evidence view                                    |
| Electrical instability  | Demonstrate electrical deviations                   | Voltage/current/frequency variation                    | Electrical alert and chart evidence                           |
| Sudden shutdown         | Demonstrate connectivity/operating-state transition | Run state changes and measurements stop/change         | Asset/device state and stale/offline behavior where simulated |

Exact values, units, and thresholds must be documented in simulator technical specifications. UI must not imply these values are certified operating limits for real generator models.

## 7. State model

Proposed run states:

```text
IDLE → STARTING → RUNNING ↔ PAUSED → STOPPING → COMPLETED
                  └──────────────────────────→ FAILED
```

- `IDLE`: no active run.
- `STARTING`: run request accepted; setup in progress.
- `RUNNING`: data generation is active.
- `PAUSED`: generation temporarily suspended.
- `STOPPING`: stop requested and cleanup in progress.
- `COMPLETED`: run ended normally.
- `FAILED`: run ended due to an error; show diagnostic reference and retry option if safe.

The UI must reflect backend-confirmed state, not merely optimistic button clicks. Disable incompatible actions based on current state.

## 8. Fault injection UX

- Show supported fault types for the selected scenario.
- Explain that fault injection modifies synthetic output only.
- Provide configuration limits and validation messages.
- Show scheduled/active/completed state.
- Require confirmation for disruptive scenario changes while a run is active.
- Record who injected the fault, when, and what configuration was applied.
- Do not allow arbitrary payloads or scripts in the MVP.

## 9. Data isolation and labeling

Every simulated run and generated record must carry a machine-readable source/environment marker, such as `SIMULATOR` and a `simulationRunId`. The UI must:

- Display a persistent simulation banner.
- Display a `SIMULATED` label on asset, chart, alert, incident, and work-order contexts derived from simulated data.
- Provide a filter to include/exclude simulated records in analytics.
- Avoid mixing simulated and real data in a single KPI without an explicit label and inclusion rule.
- Ensure simulator data does not silently appear as production telemetry.

## 10. Failure states

Design these cases:

- Simulator service unavailable.
- Scenario configuration invalid.
- Start request timed out.
- User loses permission during an active run.
- Run fails after partial data generation.
- Event stream disconnects.
- Stop request is pending.
- Existing active run prevents another start.
- A run is completed but downstream telemetry processing is delayed.

The UI should explain whether a run is still active, stopped, failed, or simply not updating. Never infer a failed run solely from a delayed browser event.

## 11. Simulator-to-product workflow

The primary demo should be:

1. Open Simulator.
2. Select Generator-01.
3. Select Normal Operation and start.
4. Open Live Monitoring and inspect values.
5. Pause the run.
6. Resume with Progressive Overheating or start a controlled fault scenario.
7. Observe threshold/anomaly event.
8. Open the generated alert.
9. Create or inspect the linked incident according to policy.
10. Assign a work order and document a simulated inspection.
11. Stop the run and inspect run history.

## 12. Permissions

- View simulator state: authorized facility and operational roles.
- Start/stop simulation: configurable; initially admin/owner/facility-manager roles.
- Change scenario parameters: elevated permission.
- Inject faults: explicit permission; never available to read-only users.
- Delete/reset generated records: restricted and audited; avoid destructive cleanup in ordinary user workflows.

## 13. Acceptance criteria

- [ ] Every simulator page/context shows `SIMULATED` or `DEMO DATA`.
- [ ] Controls are clearly simulation controls, not equipment controls.
- [ ] Run state is server-confirmed and shown accurately.
- [ ] Supported scenarios are documented.
- [ ] Fault injection is permission-controlled and audited.
- [ ] Simulation source and run ID are traceable through telemetry and related events.
- [ ] Analytics distinguishes simulated from non-simulated data.
- [ ] Error and reconnect states are designed.
- [ ] Primary end-to-end demo flow is prototype-ready.
