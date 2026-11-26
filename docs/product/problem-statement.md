# GridAware — Problem Statement & Opportunity Analysis

**Version:** 1.1  
**Status:** Discovery baseline; customer hypotheses require validation  
**Related:** `PRD.md`, `target-users.md`, `discovery-assumptions.md`, `success-metrics.md`

---

## 1. Executive problem statement

Organizations operating factories and commercial buildings depend on equipment that must remain available and operate within appropriate conditions. Examples include backup generators, HVAC systems, pumps, electrical distribution equipment, and supporting mechanical systems.

Operational information about these assets can be spread across device displays, local monitoring systems, periodic inspection sheets, maintenance spreadsheets, incident logs, and the knowledge of individual employees. When asset identity, current measurements, historical behavior, alerts, and maintenance actions are not connected, teams may struggle to determine what is happening, how serious it is, and who should take the next action.

Some equipment problems are preceded by measurable changes. Depending on equipment type and instrumentation, relevant signals may include temperature, vibration, voltage, current, pressure, operating state, runtime, or energy consumption. Collecting a signal alone does not make it useful. It must be tied to the correct asset and sensor, timestamped, quality-checked, interpreted in context, and presented to a person who can investigate it.

**Primary problem:** Facility and maintenance teams may lack a unified, traceable way to connect infrastructure asset information, operating measurements, emerging abnormal conditions, and maintenance actions.

**Product opportunity:** GridAware provides a unified workflow from asset context and telemetry to alert review, incident handling, and maintenance records. The first version demonstrates this workflow with simulated generator data.

## 2. Problem context

### 2.1 Asset and location fragmentation

Equipment records may be organized inconsistently across organizations, sites, buildings, and rooms. A measurement or maintenance note is difficult to interpret if the user cannot quickly answer:

- Which asset does this record refer to?
- Where is the asset installed?
- Which sensors are associated with it?
- Who is responsible for the asset?
- What is its operational criticality?

**Impact:** Information can be separated from the equipment and location it describes.  
**Product response:** A hierarchy of organization → site → building/area → asset → sensor, with tenant-aware ownership and stable identifiers.

### 2.2 Limited visibility into operating history

A current reading is only one point in time. A temperature value may be normal for one asset and unusual for another. A trend can be more informative than a single measurement, but only if the system retains timestamps, units, data quality, and enough history.

**Impact:** Users may not know whether a value is stable, increasing, delayed, or stale.  
**Product response:** Current values, historical charts, time-range filtering, freshness indicators, and explicit treatment of missing data.

### 2.3 Alerts without enough context

A threshold notification that only says “temperature high” may not explain which asset is affected, which threshold was configured, how long the condition persisted, or whether another signal changed at the same time.

**Impact:** The recipient must gather context from other tools before deciding what to do. Poorly designed alerts can also create unnecessary noise.  
**Product response:** Alerts linked to asset, sensor, measurement, rule/detector, observed time, severity, and available history. Transparent threshold rules are the starting point; advanced anomaly detection is a separately evaluated capability.

### 2.4 Disconnected response workflow

Detection is not resolution. After a potential issue is identified, a team may need to triage it, assign ownership, inspect equipment, record findings, create maintenance work, and close the issue. If this process occurs in separate channels, the history can become incomplete.

**Impact:** Ownership can be unclear, work can be delayed, and historical records may be incomplete.  
**Product response:** Incidents, status transitions, assignments, work orders, investigation notes, resolution details, and audit history.

### 2.5 Unclear prioritization

Not every alert has equal operational importance. A condition affecting a critical backup generator may deserve faster review than a similar condition on a non-critical asset. Severity should consider evidence and business context, not only the raw sensor value.

**Impact:** Users may struggle to prioritize competing issues.  
**Product response:** Configurable asset criticality and transparent risk context. Risk indicators are decision support, not certified safety judgments.

## 3. Root-cause and consequence model

| Root area             | Contributing condition                               | Possible operational consequence       | Product response                             |
| --------------------- | ---------------------------------------------------- | -------------------------------------- | -------------------------------------------- |
| Data fragmentation    | Asset, sensor, and maintenance records are separated | Incomplete understanding of an asset   | Unified asset hierarchy and linked history   |
| Poor data context     | Missing unit, timestamp, quality, or asset mapping   | Misleading display or invalid analysis | Telemetry schema and validation              |
| Manual monitoring     | Users inspect multiple screens or records            | Delayed recognition                    | Central monitoring and notifications         |
| Rule-only alerts      | Alerts lack trend and operational context            | Noise or missed patterns               | Contextual alerts and later anomaly analysis |
| Unstructured response | No shared incident ownership or lifecycle            | Delayed or undocumented resolution     | Incident and work-order workflows            |
| Inconsistent history  | Maintenance actions are not linked to assets         | Limited learning from past events      | Maintenance records and audit history        |

This is a problem model, not a claim that every target customer experiences every condition.

## 4. Who experiences the problem?

### Facility Manager

Needs an organization/site view and a way to identify assets that require attention. The manager cares about availability, operational priorities, unresolved incidents, and ownership.

### Maintenance Engineer

Needs technical context: measurement trends, thresholds, prior incidents, specifications, and evidence behind a warning. The engineer decides what investigation or maintenance action is appropriate.

### Technician

Needs a clear task with asset location, reported condition, instructions, and a place to record observations and completion details.

### Organization Owner

Needs confidence that the organization is configured correctly, members have appropriate access, and site operations can be reviewed without exposing data from other tenants.

## 5. Why simulator-only is the correct first boundary

The approved first operating mode is simulator-only. This is a product-development boundary, not a claim that simulated data reproduces every real-world condition.

A simulator allows the team to:

- Demonstrate the end-to-end workflow without requiring physical sensors or customer OT access.
- Produce repeatable normal and fault scenarios.
- Test timestamp handling, duplicate events, delayed messages, sensor outages, and validation.
- Create known ground-truth labels for controlled software tests.
- Replay the same scenario after frontend, backend, ingestion, or detection changes.

The simulator must label generated data as simulated. Scenario assumptions and limitations must be documented. Synthetic data can demonstrate software behavior and support controlled experiments; it cannot alone prove that an AI model generalizes to real equipment.

## 6. Initial problem-to-outcome chain

**Scenario:** A factory or commercial-building operator wants to monitor a backup generator and organize maintenance when its simulated operating signals become abnormal.

| Step          | User/system need                          | GridAware response                                 | Intended outcome                        |
| ------------- | ----------------------------------------- | -------------------------------------------------- | --------------------------------------- |
| Identify      | Know which equipment is managed           | Register organization, site, asset, and sensors    | Equipment has a stable digital identity |
| Observe       | See what is happening                     | Ingest and display telemetry                       | Shared operational visibility           |
| Contextualize | Understand whether a value is unusual     | Show units, trends, quality, and configured rules  | More informed review                    |
| Detect        | Recognize a configured abnormal condition | Generate a contextual event                        | Condition becomes visible               |
| Prioritize    | Understand what needs attention first     | Show severity, asset criticality, and data quality | Better triage support                   |
| Respond       | Assign someone to investigate             | Create incident and work order                     | Clear ownership                         |
| Learn         | Retain what happened                      | Record findings and resolution                     | Traceable maintenance history           |

## 7. Problem hypotheses to validate

| ID   | Hypothesis                                                          | Evidence needed                                   | Method                         |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------ |
| H-01 | Target teams have difficulty seeing asset status across tools/sites | Examples of current tools and reporting steps     | Facility manager interviews    |
| H-02 | Linking telemetry to asset history improves alert investigation     | Current alert examples and investigation workflow | Workflow walkthrough           |
| H-03 | Structured work orders reduce missing response information          | Task handoff and close-out records                | Engineer/technician interviews |
| H-04 | Multi-site visibility is valuable to some buyers                    | Number of sites and cross-site reporting needs    | Owner interviews               |
| H-05 | Simulated workflows are sufficient for early demos                  | Feedback on realism and usability                 | Moderated demo test            |
| H-06 | Generator monitoring is a credible first scenario                   | Maintenance process and signal availability       | Domain expert review           |
| H-07 | HVAC is a suitable second scenario for commercial buildings         | Measurements, roles, and alert logic              | Building operations interviews |

## 8. Discovery interview guide

Do not begin by pitching GridAware. Ask about the participant's existing process.

1. Tell me about the facilities and equipment you are responsible for.
2. How do you currently know whether an asset is operating normally?
3. Which systems, dashboards, logs, or spreadsheets do you use?
4. What typically causes you to inspect an asset?
5. Walk me through the last equipment issue from first indication to resolution.
6. How was the issue detected, and how confident were you in the information?
7. How are severity and priority decided?
8. Who owns the incident at each stage?
9. How are technicians assigned work and how do they record completion?
10. What information is usually missing during investigation?
11. Which assets are most critical, and why?
12. What would make a centralized platform useful enough to adopt?
13. What concerns would prevent you from using it?
14. Which existing systems would a future deployment need to integrate with?

Record participant role, organization type, workflow details, artifacts reviewed, and contradictions. Use direct quotes only with permission. Separate observed facts from interpretation.

## 9. Non-goals and claims we must avoid

This problem statement does not imply that GridAware will:

- Guarantee failure prevention or zero downtime.
- Replace maintenance engineers or manufacturer guidance.
- Replace equipment alarms or protective devices.
- Control equipment or send operational commands.
- Diagnose physical root cause with certainty from model explanations.
- Support every asset type in the first release.
- Prove real-world predictive accuracy using synthetic data alone.

## 10. Validation exit criteria

- Relevant stakeholders from both intended market segments have been interviewed, or the unvalidated segment is explicitly deferred.
- Current workflows are documented with concrete examples.
- Pain points are ranked by frequency, severity, and user impact.
- Generator-first is reviewed by a relevant domain stakeholder.
- Major assumptions have owners and validation status in `discovery-assumptions.md`.
- No marketing claim about downtime reduction or predictive accuracy is made without evidence.
