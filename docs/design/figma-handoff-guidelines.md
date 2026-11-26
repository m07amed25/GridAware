# GridAware — Figma Handoff Guidelines

**Document version:** 1.0  
**Status:** Proposed handoff standard  
**Audience:** Product designer, frontend engineer, product owner, QA  
**Related documents:** All files in `docs/design/`, especially `design-system.md`, `component-catalog.md`, `screen-inventory.md`, `interaction-specifications.md`, `design-acceptance-criteria.md`

---

## 1. Purpose

This document defines how GridAware design work is organized, reviewed, annotated, and handed to engineering. The goal is to make Figma a reliable source for visual and interaction intent without treating it as a substitute for product requirements, API contracts, or implementation documentation.

No Figma screens or prototypes are claimed to exist until they are actually created and reviewed. This document specifies the expected handoff quality.

## 2. Figma file structure

Recommended file: `GridAware — Product Design`

Pages:

```text
00 — Cover & Design Index
01 — Foundations
02 — Design Tokens
03 — Components
04 — Patterns
05 — Application Shell
06 — Authentication & Onboarding
07 — Dashboard
08 — Infrastructure
09 — Monitoring
10 — Intelligence
11 — Alerts & Incidents
12 — Maintenance & Work Orders
13 — Analytics
14 — Administration
15 — Simulator Experience
16 — Responsive Designs
17 — Interactive Prototype
18 — Archive (Deprecated)
```

Use separate Figma files only if file performance or collaboration needs justify it. Keep a shared library for foundations and reusable components where possible.

## 3. Naming conventions

### Frames

Use:

`[Area] / [Screen] / [Viewport] / [State]`

Examples:

- `Dashboard / Overview / Desktop / Default`
- `Monitoring / Asset Telemetry / Desktop / Stale Data`
- `Incidents / Incident Detail / Mobile / Assigned`
- `Simulator / Scenario Console / Tablet / Running`

### Components

Use descriptive component names and properties:

- `Button / Variant=Primary / Size=Medium / State=Default`
- `StatusBadge / Status=Stale`
- `MetricCard / Trend=Up / State=Available`
- `Sidebar / Mode=Collapsed`

Prefer variants/properties over duplicating almost identical components.

### Sections

Add section descriptions with purpose, status, related PRD requirements, and review notes.

## 4. Design token handoff

Maintain token names in a structured page and map them to code-friendly names. Proposed groups:

- `color.brand.*`
- `color.surface.*`
- `color.text.*`
- `color.border.*`
- `color.status.*`
- `color.focus.*`
- `spacing.*`
- `radius.*`
- `typography.*`
- `shadow.*`
- `motion.*`
- `breakpoint.*`

The six EVARAX source colors are fixed. Neutral surfaces, text hierarchy, and operational semantic colors are derived/proposed tokens and must have their approval status recorded.

Do not hand off raw color overrides as a substitute for tokens. If a screen requires an exceptional color, document why and whether it should become a new token.

## 5. Required screen artifacts

For each screen in `screen-inventory.md`, include:

1. Primary desktop frame.
2. Relevant tablet frame.
3. Relevant mobile frame or explicit mobile behavior note.
4. Default state.
5. Empty state.
6. Loading state.
7. Error state.
8. Permission-denied or restricted state where applicable.
9. Stale/offline/partial-data states where applicable.
10. At least one realistic populated state.

Critical operational screens require explicit severity, status, and data freshness variants.

## 6. Component handoff requirements

Every reusable component should document:

- Name and purpose.
- Component properties and variants.
- Default and interactive states.
- Content limits and truncation behavior.
- Responsive behavior.
- Keyboard/focus behavior.
- Accessibility notes.
- Token references.
- Example usage and anti-patterns.

For charts, specify metric, units, axes, range, aggregation, threshold semantics, anomaly treatment, freshness, and accessible data alternative.

## 7. Interaction annotations

For each interactive screen, annotate:

- Click/tap action.
- Keyboard action.
- Hover/focus/pressed states.
- Validation and error handling.
- Loading and success feedback.
- Navigation result.
- Permission requirements.
- Destructive action confirmation.
- Real-time update behavior.
- Whether data changes are optimistic or confirmed by server.

Do not leave interaction behavior to guesswork. Link to `interaction-specifications.md` for the canonical behavior rules.

## 8. Prototype requirements

The prototype should connect the following end-to-end flows:

1. Login → organization selection → dashboard.
2. Dashboard → site → asset detail.
3. Asset detail → live monitoring → chart inspection.
4. Anomaly/alert → incident detail → assignment.
5. Work order → technician update → completion.
6. Simulator → select scenario → start → pause/resume → stop.

The prototype must include at least one alternate/error state for high-risk workflows. A prototype interaction does not prove the backend behavior is implemented.

## 9. Handoff package

A design handoff release should contain:

- Figma file URL and release/version label.
- Approved screen list.
- Token mapping reference.
- Component inventory and library version.
- Interaction annotations.
- Responsive behavior notes.
- Accessibility review notes.
- Open questions and known deviations.
- Links to the related PRD, user stories, and API/architecture contracts when relevant.

## 10. Design status labels

Use consistent statuses:

- `Exploration` — incomplete alternatives.
- `Draft` — first complete proposal.
- `In Review` — awaiting feedback.
- `Approved` — accepted for handoff.
- `Implemented` — verified in the product UI.
- `Deprecated` — no longer current.

Do not label a Figma screen `Implemented` solely because it has been handed off.

## 11. Developer handoff checks

Before implementation:

- Confirm the frame is the approved version.
- Confirm required states exist.
- Confirm responsive behavior.
- Confirm spacing and typography tokens.
- Confirm asset/icon sources and licenses where relevant.
- Confirm exact copy and terminology.
- Confirm role/permission behavior.
- Confirm no hidden interaction depends only on hover.
- Confirm analytics labels and units.

During implementation:

- Raise a design issue for any missing specification.
- Avoid making arbitrary visual decisions for critical operational states.
- Record deviations and get approval where the change affects workflow or meaning.

## 12. Design QA process

1. Designer reviews implemented page against approved frame.
2. Engineer checks behavior, responsive states, and component tokens.
3. QA checks functional states and accessibility.
4. Product owner checks workflow and terminology.
5. Record defects and assign severity.
6. Re-test after fixes.

Visual QA should use consistent viewport sizes and representative data, including long names, missing values, high severity, and simulated records.

## 13. Versioning and change management

- Use a versioned design release label, e.g. `GridAware Design v0.2`.
- Keep approved pages stable during implementation.
- Record changes that affect layout, interaction, or information hierarchy.
- Update related Markdown specs when Figma decisions change the product contract.
- Archive replaced components/frames rather than silently deleting historical decisions.

## 14. Acceptance criteria

- [ ] Every required screen has a named frame and documented status.
- [ ] Required states are designed.
- [ ] Tokens are mapped to implementation names.
- [ ] Components have variants and behavior notes.
- [ ] Core prototypes are connected.
- [ ] Responsive and accessibility notes are present.
- [ ] Engineering can implement without guessing critical behavior.
- [ ] Deviations and open decisions are recorded.
