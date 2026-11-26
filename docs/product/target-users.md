# GridAware — Target Users, Personas & Access Model

**Version:** 1.1  
**Status:** Baseline personas and access model; validate through interviews  
**Related:** `PRD.md`, `problem-statement.md`, `user-stories.md`, `functional-requirements.md`

---

## 1. Target customer segments

GridAware is initially designed for two related but different operating environments.

### 1.1 Factories

Typical context:

- One or more production or support facilities.
- Backup power and electrical distribution assets.
- Pumps, motors, HVAC, and other maintainable equipment.
- Facility, engineering, and maintenance personnel.
- Operational requirements that vary by asset criticality and production dependency.

Potential needs:

- Understand equipment status across a site.
- Review abnormal operating measurements.
- Link alerts to maintenance ownership.
- Retain incident and maintenance history.

The first simulated generator scenario is relevant to this segment, but it does not validate every factory equipment type.

### 1.2 Commercial buildings

Typical context:

- One or more buildings managed by an owner or facilities provider.
- HVAC, generators, pumps, electrical distribution, and building services.
- Facility managers and contracted maintenance technicians.
- Need to coordinate planned and corrective maintenance.

Potential needs:

- View assets by building and site.
- Identify unavailable or abnormal equipment.
- Coordinate contractors or internal technicians.
- Review maintenance status and recurring issues.

A simulated HVAC scenario should be used as a second validation workflow before claiming that the MVP adequately serves this segment.

## 2. Organization and account concepts

GridAware is multi-tenant B2B SaaS. The following concepts must be distinguished:

- **Platform:** The overall GridAware service.
- **Organization (tenant):** A customer company or operating entity whose users and operational records are isolated from other organizations.
- **Membership:** The relationship between a user and an organization, including role and status.
- **Site:** A physical facility or campus managed by an organization.
- **Building:** A building or named area inside a site when needed.
- **Asset:** Maintainable equipment such as a generator or HVAC unit.
- **Sensor:** A measurement source associated with an asset.
- **Device:** A simulator or, in a later release, a physical gateway/device identity that publishes measurements.

A user may have membership in more than one organization. Authorization must be evaluated for the active organization and requested resource; the frontend's selected organization is not proof of access.

## 3. Personas

### 3.1 Organization Owner — account and access administrator

**Profile:** A business owner, operations director, or delegated administrator responsible for a customer organization.

**Primary goals:**

- Establish the organization's GridAware workspace.
- Add and remove members.
- Assign roles and site access.
- Maintain accurate site and asset ownership.
- Review organization-level operational summaries.

**Tasks:**

- Complete initial organization setup.
- Invite a Facility Manager and maintenance users.
- Review membership status.
- Update organization profile and preferences.
- Ensure access is removed when a member leaves.

**Pain points to validate:**

- Difficulty coordinating access across several facilities.
- Uncertainty about who can see or modify operational data.
- Lack of a reliable organization-wide overview.

**Needs from GridAware:**

- Organization settings.
- Membership management.
- Role assignment.
- Site access configuration.
- Audit history for sensitive changes.

**Primary success measure:** Authorized users can perform their assigned work while unauthorized users are denied access.

### 3.2 Facility Manager — operational overview owner

**Profile:** Responsible for the day-to-day condition of one or more facilities.

**Primary goals:**

- Understand asset status across assigned sites.
- Identify active or high-priority issues.
- Ensure every incident has an owner.
- Monitor outstanding work orders.
- Review operational trends.

**Typical workflow:**

1. Open the dashboard.
2. Select an organization/site context.
3. Review equipment health and data freshness.
4. Inspect active alerts and incidents.
5. Confirm assignment and response progress.
6. Review overdue work orders and unresolved issues.

**Needs from GridAware:**

- Site and asset overview.
- Current status and freshness indicators.
- Alert/incident queue.
- Filters by site, asset type, status, and severity.
- Work-order summary.
- Readable operational reports.

**Primary success measure:** The manager can identify the operational issues requiring attention and see their current owners and status.

### 3.3 Maintenance Engineer — technical investigator

**Profile:** An engineer responsible for investigating reported equipment conditions and determining the next maintenance action.

**Primary goals:**

- Understand the evidence behind a warning.
- Compare current and historical measurements.
- Review equipment specifications and previous maintenance.
- Prioritize inspection.
- Assign or create maintenance work.
- Document technical findings.

**Typical workflow:**

1. Open an alert or incident.
2. Review the asset, sensor, metric, value, timestamp, unit, and rule.
3. Inspect historical trend and data quality.
4. Review asset criticality and related events.
5. Triage the incident.
6. Assign or create a work order.
7. Review the technician's findings.
8. Resolve or reopen the incident based on evidence.

**Needs from GridAware:**

- Detailed asset page.
- Time-range charts.
- Threshold configuration visibility.
- Anomaly evidence and model version when applicable.
- Related incident and maintenance history.
- Investigation notes and workflow transitions.

**Primary success measure:** The engineer can understand why an issue was raised and create a traceable, appropriately assigned response.

### 3.4 Technician — task executor

**Profile:** A field technician or maintenance worker who performs inspections, repairs, and preventive maintenance.

**Primary goals:**

- Know what needs to be checked.
- Identify the correct asset and location.
- Understand the reported symptom and task instructions.
- Record work performed and completion evidence.

**Typical workflow:**

1. Open assigned work orders.
2. Select a work order.
3. Review asset details, site/building location, issue description, priority, and instructions.
4. Start the work or update task status.
5. Record inspection findings and action taken.
6. Add completion notes and submit the result.

**Needs from GridAware:**

- Simple assigned-work view.
- Clear task details.
- Asset and location context.
- Status updates.
- Notes and evidence fields.
- Clear distinction between saving a draft and completing a task.

**Primary success measure:** Assigned work is completed and documented with sufficient information for the engineer or manager to review.

### 3.5 Viewer — read-only stakeholder

**Profile:** A manager, auditor, or stakeholder who needs visibility but should not change operational records.

**Primary goals:**

- Review authorized dashboards and reports.
- Understand incident status and trends.
- Avoid accidental changes to configuration or work records.

**Needs from GridAware:**

- Read-only navigation.
- Clearly labeled data periods and freshness.
- No create, update, assign, resolve, or configuration controls unless explicitly granted elsewhere.

**Primary success measure:** The viewer can access relevant information while write operations are denied by the backend.

### 3.6 Platform Administrator — internal operations

**Profile:** A trusted internal operator responsible for platform support and service operations.

**Primary goals:**

- Maintain platform health.
- Investigate operational failures.
- Support customer account issues under controlled processes.
- Review service-level telemetry and audit trails.

**Requirements:**

- Separate platform-level identity and authorization.
- Strong authentication.
- Minimal privileges.
- Audited support access.
- No implicit unrestricted browsing of customer data.

This is not a normal tenant role and must not be confused with Organization Owner.

## 4. Role and permission baseline

The following matrix is a proposed starting point. It must be implemented as backend-enforced permissions, not only frontend visibility rules.

| Capability                    | Org Owner | Facility Manager | Maintenance Engineer |       Technician |         Viewer |
| ----------------------------- | --------: | ---------------: | -------------------: | ---------------: | -------------: |
| View organization overview    |       Yes |   Assigned scope |       Assigned scope |   Assigned scope | Assigned scope |
| Manage organization profile   |       Yes |               No |                   No |               No |             No |
| Invite/manage members         |       Yes |             No\* |                   No |               No |             No |
| Manage sites/buildings        |       Yes | Assigned scope\* |                 View |             View |           View |
| Create/update assets          |       Yes |   Assigned scope |     Assigned scope\* |               No |             No |
| Manage sensors and thresholds |       Yes | Assigned scope\* |       Assigned scope |               No |             No |
| View telemetry                |       Yes |   Assigned scope |       Assigned scope |   Assigned scope | Assigned scope |
| Triage incidents              |       Yes |              Yes |                  Yes | Limited update\* |             No |
| Assign work orders            |       Yes |              Yes |                  Yes |               No |             No |
| Update assigned work          |       Yes |              Yes |                  Yes |              Yes |             No |
| Resolve incidents             |       Yes |              Yes |                Yes\* |             No\* |             No |
| View analytics                |       Yes |   Assigned scope |       Assigned scope |          Limited | Assigned scope |
| View audit logs               |     Yes\* |        Limited\* |                   No |               No |             No |

`*` means a narrower permission may be configured by policy. The MVP should not implement ambiguous implicit powers. Define explicit permission keys and scope checks before coding.

## 5. Authorization model

Authorization must consider:

1. **Identity:** Who is making the request?
2. **Membership:** Is the user an active member of the organization?
3. **Role/permission:** Is the user allowed to perform this action?
4. **Resource ownership:** Does the target record belong to the active organization?
5. **Scope:** Is the resource within the user's assigned site or operational scope, if site-scoped access is enabled?
6. **State:** Is the requested transition allowed from the resource's current state?

A user must not gain access by submitting another organization's identifier in a request body or URL. Background jobs must carry trusted tenant context and revalidate resource ownership where appropriate.

## 6. Primary user journeys

### Journey A — Organization onboarding

1. Owner creates an account or accepts an organization invitation.
2. Owner creates or joins an organization.
3. Owner sets organization details and time zone.
4. Owner creates the first site.
5. Owner invites a Facility Manager.
6. Facility Manager receives access only to the assigned organization/site scope.

### Journey B — Register and monitor an asset

1. Authorized user selects a site.
2. User creates a generator asset.
3. User records required asset metadata and criticality.
4. User registers sensors and maps metrics/units.
5. Simulator device is associated with the intended asset/sensors.
6. Telemetry begins arriving.
7. User sees current status, last-seen time, and history.

### Journey C — Investigate and resolve an incident

1. An alert is generated from a configured rule.
2. Engineer reviews the alert context.
3. Engineer triages and creates or confirms an incident.
4. Manager/engineer assigns a work order.
5. Technician performs the task and submits findings.
6. Engineer reviews the result and resolves the incident.
7. The platform retains the incident and maintenance timeline.

### Journey D — Review organization operations

1. Owner or manager opens overview.
2. User filters by site or date range.
3. User reviews active incidents, asset status, and work orders.
4. User opens a detail record for evidence.
5. User exports or shares information only through authorized capabilities included in the release.

## 7. Accessibility and usability considerations

- Important statuses must not rely on color alone; include text labels and icons where appropriate.
- Critical alerts must be visually distinguishable without flashing or relying on animation.
- Tables should support keyboard navigation and clear focus states.
- Forms must provide field-level validation and actionable error messages.
- Timestamps should show a clear time zone context.
- Sensor readings must show units beside values.
- Stale or missing readings must not look like healthy readings.
- Technician workflows should minimize unnecessary navigation and avoid dense analytics that are irrelevant to task completion.

## 8. Open questions for research

- Do customers expect site-level permission scoping in the first pilot?
- Do technicians work directly in a browser, on mobile, or through a contractor workflow?
- Are external maintenance contractors part of the target workflow?
- Which asset metadata fields are consistently available to customers?
- Do factories and commercial buildings use similar incident severity definitions?
- Which notification channels are operationally acceptable?
- Do organizations expect a viewer role to see all sites or only assigned sites?

## 9. Persona validation exit criteria

- Interview at least one representative from each key operational role where feasible.
- Confirm whether the proposed role names match language used by target customers.
- Validate the incident-to-work-order handoff with both an engineer and a technician.
- Identify any role conflicts or missing permissions.
- Update this document and `functional-requirements.md` before finalizing authorization design.
