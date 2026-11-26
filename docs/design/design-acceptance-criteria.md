# GridAware — Design Acceptance Criteria

**Document version:** 1.0  
**Status:** Proposed review and sign-off checklist  
**Product baseline:** GridAware PRD v1.0  
**Related documents:** All documents in `docs/design/`  
**Applies to:** IA, sitemap, user flows, screen inventory, wireframes, visual design, prototype, and design handoff

---

## 1. Purpose

This document defines objective criteria for deciding whether the GridAware UX/UI design phase is complete and ready for engineering handoff. It prevents a design phase from being considered finished merely because screens look polished.

Design sign-off requires structural completeness, user-flow coverage, role-aware behavior, data-state clarity, responsive layouts, accessibility review, consistent EVARAX usage, and traceability to the approved PRD.

## 2. Acceptance Levels

- **Must pass:** Required before engineering implementation of the affected P0 feature.
- **Should pass:** Required before pilot release; may be tracked as a documented design debt item during early implementation.
- **Later:** Not required for the first vertical slice; must not be implied as delivered.

A critical security, tenant-isolation, data-freshness, or misleading-status issue cannot be waived as a cosmetic design debt item.

## 3. Product and Scope Alignment

### Must pass

- [ ] Design reflects GridAware as a multi-tenant B2B SaaS product.
- [ ] Initial market covers factories and commercial buildings, while the first detailed workflow remains a simulated generator.
- [ ] Simulator-only operation is clearly represented in initial screens.
- [ ] Simulator data is visibly labeled and cannot be mistaken for real field telemetry.
- [ ] MVP screens align with `PRD.md` and do not silently introduce out-of-scope functionality.
- [ ] Predictive failure probability, remaining useful life, and advanced root-cause analysis are not presented as available unless separately implemented and validated.
- [ ] Alerts, incidents, and work orders are represented as separate concepts.
- [ ] The asset remains the canonical context for telemetry, alerts, incidents, and maintenance.

### Should pass

- [ ] Design leaves room for a second equipment scenario (such as HVAC) without restructuring the whole navigation.
- [ ] P1/P2 features are labeled as future scope in design notes.

## 4. Information Architecture and Navigation

### Must pass

- [ ] Every P0 information domain has a destination in the sitemap.
- [ ] Navigation labels are understandable to facility/maintenance users and do not mirror internal backend module names unnecessarily.
- [ ] Active organization context is visible in the authenticated shell.
- [ ] Organization switcher only lists valid memberships.
- [ ] Tenant switch clears/revalidates tenant-specific UI state before rendering new data.
- [ ] Site/building hierarchy is optional where appropriate; assets can belong directly to a site.
- [ ] Breadcrumbs correctly represent organization/site/asset/record context.
- [ ] Role-aware navigation does not expose forbidden actions.
- [ ] A route is not considered secure simply because it is hidden from the sidebar.

## 5. User Flow Coverage

### Must pass

- [ ] UF-01 registration and organization creation is represented.
- [ ] UF-03 onboarding checklist is represented.
- [ ] UF-04 site creation is represented.
- [ ] UF-05 generator registration is represented.
- [ ] UF-06 simulated device/sensor configuration is represented.
- [ ] UF-07 simulator start/pause/stop and failure paths are represented.
- [ ] UF-08 live and historical monitoring is represented.
- [ ] UF-09 alert review is represented.
- [ ] UF-10 alert-to-incident conversion is represented.
- [ ] UF-11 incident assignment/investigation is represented.
- [ ] UF-12 work-order creation/assignment is represented.
- [ ] UF-13 technician execution/submission is represented.
- [ ] UF-14 review and closure is represented.
- [ ] UF-15 organization switching is represented.
- [ ] UF-16 no-data/simulator failure recovery is represented.
- [ ] Every P0 flow shows the happy path and at least one relevant alternate/error/permission path.

### Should pass

- [ ] A second commercial-building scenario is represented as a future validation flow, not as an implemented MVP feature.

## 6. Screen Inventory Coverage

### Must pass

- [ ] Every P0 screen in `screen-inventory.md` has a corresponding Figma frame or explicitly documented reason for being represented as a state/overlay.
- [ ] Each screen identifies its purpose and primary user.
- [ ] Each screen identifies roles and actions.
- [ ] Each screen specifies primary content hierarchy.
- [ ] Each screen has applicable loading, empty, error, permission, and data-freshness states.
- [ ] P0 actions are represented in at least one screen and one user flow.
- [ ] List/detail relationships are clear and navigable.
- [ ] No orphan screen exists without a clear entry point or route.

## 7. Wireframe Acceptance

### Must pass

- [ ] Desktop layout has a defined application shell.
- [ ] Compact desktop behavior is documented.
- [ ] Tablet navigation and content reflow are documented.
- [ ] Mobile layouts are designed for all P0 task-critical screens.
- [ ] Tables have a narrow-screen alternative.
- [ ] Forms have logical grouping and field order.
- [ ] Main actions are visually prioritized without competing CTAs.
- [ ] Dashboard information order answers the main user question.
- [ ] Asset detail gives access to monitoring, sensors, alerts, and maintenance context.
- [ ] Incident detail makes status, priority, assignee, history, and next action easy to locate.
- [ ] Work-order detail is usable for technicians, including mobile completion.
- [ ] First-run empty state helps a user configure the first site/asset.
- [ ] Wireframes use realistic text lengths and non-happy-path content.

## 8. Design System and Brand Acceptance

### Must pass

- [ ] The six supplied EVARAX HEX values are used exactly: `#F4E952`, `#F6FA45`, `#FCCE35`, `#080808`, `#E9ECF2`, `#FFFFFF`.
- [ ] Brand accents are used intentionally and do not overwhelm operational data.
- [ ] Derived neutral tokens are explicitly labeled as derived neutrals, not original EVARAX colors.
- [ ] Semantic status colors are separate from brand colors and have approved meanings.
- [ ] Healthy, warning, critical, offline, unknown, stale, and informational states are distinguishable.
- [ ] Status is communicated through text/icon/shape as well as color.
- [ ] Typography hierarchy is consistent.
- [ ] Numeric values use consistent formatting and units.
- [ ] Spacing, radius, borders, shadows, and component sizes follow documented tokens.
- [ ] Figma variables/styles map to named design tokens.
- [ ] No arbitrary one-off color appears without documented reason.

### Should pass

- [ ] Light theme is either explicitly deferred or designed as a separate supported theme; do not imply both themes are supported if only dark is implemented.
- [ ] Color-blindness checks have been performed on semantic status and chart palettes.

## 9. Data and Telemetry Presentation

### Must pass

- [ ] A measurement always has a metric name and unit.
- [ ] Observed time is distinguishable from ingestion/last-received time where relevant.
- [ ] Timezone is clear in historical views.
- [ ] Latest value is never presented without a data freshness indicator.
- [ ] No telemetry ever received is distinct from stale telemetry.
- [ ] Simulator paused is distinct from simulator offline.
- [ ] Stale/offline/unknown data is never displayed as healthy by default.
- [ ] Missing data is not silently interpolated as normal operation.
- [ ] Chart thresholds and alert markers are labeled.
- [ ] Chart tooltips expose exact timestamp, value, unit, quality, and source.
- [ ] Simulated data is visibly labeled on relevant screens and reports.
- [ ] Chart colors are distinguishable and do not rely only on yellow/lime/gold hue differences.

## 10. Role and Permission Acceptance

### Must pass

- [ ] Owner sees appropriate organization administration controls.
- [ ] Facility Manager sees site/asset/operational controls allowed by the PRD.
- [ ] Engineer can review alerts/incidents and manage work orders within assigned scope.
- [ ] Technician sees assigned work and the controls needed to record findings/completion.
- [ ] Viewer has read-only access and no misleading enabled write controls.
- [ ] Read-only records still show enough context for the user to understand status.
- [ ] Disabled controls explain why when the explanation is useful.
- [ ] Permission-denied states do not reveal the existence of cross-tenant resources.
- [ ] The frontend is not treated as the authorization boundary; handoff notes backend enforcement.

## 11. Interaction and Feedback Acceptance

### Must pass

- [ ] Buttons have clear labels and a defined outcome.
- [ ] Forms have field-level and form-level error behavior.
- [ ] Duplicate submissions are prevented.
- [ ] Pending/loading states exist for asynchronous operations.
- [ ] Success feedback is visible and critical state changes persist on the page.
- [ ] Network/server failures preserve safe user input and provide retry guidance.
- [ ] Unsaved-change behavior is defined.
- [ ] Destructive/high-impact operations have appropriate confirmation.
- [ ] Incident status controls expose only valid transitions.
- [ ] Work-order completion/review behavior is role-aware.
- [ ] Dialogs and drawers define focus and keyboard behavior.
- [ ] Organization switching prevents stale cross-tenant data display.

## 12. Accessibility Acceptance

Target: WCAG 2.2 AA for applicable user interface content and interactions.

### Must pass

- [ ] Text contrast is checked for all primary text/background combinations.
- [ ] Controls and meaningful non-text indicators have adequate contrast.
- [ ] Keyboard-only user can complete every P0 flow.
- [ ] Focus indicator is visible and not obscured.
- [ ] Focus order follows the visual/logical order.
- [ ] Form controls have persistent accessible labels.
- [ ] Errors are associated with fields and understandable without color.
- [ ] Status badges have readable text labels.
- [ ] Charts expose critical information without hover-only interaction.
- [ ] Dialogs manage focus and return focus correctly.
- [ ] Reduced-motion preference is respected.
- [ ] Mobile touch targets are appropriately sized.

## 13. Responsive Acceptance

### Must pass

- [ ] P0 screens are reviewed at desktop, compact desktop, tablet, and mobile reference widths.
- [ ] No horizontal page overflow occurs at supported widths except intentional table/chart scroll regions.
- [ ] Sidebar adapts without hiding core navigation.
- [ ] Primary actions remain discoverable.
- [ ] Tables transform or reflow without losing critical context.
- [ ] Charts remain interpretable and controls remain accessible.
- [ ] Technician work-order completion is usable on mobile.
- [ ] Long organization, site, asset, and user names do not break the layout.

## 14. Figma File and Handoff Acceptance

### Must pass

- [ ] Figma file has clear pages for Foundations, Components, Wireframes, High-Fidelity Screens, and Prototype/Flows.
- [ ] Frames use consistent names and IDs matching this specification.
- [ ] Components use variants for meaningful states (default, hover, focus, disabled, loading, error, selected).
- [ ] Variables/styles use design token names from `design-system.md`.
- [ ] Auto Layout is used for reusable responsive structures where practical.
- [ ] Prototype links cover all P0 flows.
- [ ] Annotations explain behavior not obvious from appearance.
- [ ] Open questions and deferred scope are documented.
- [ ] Handoff includes spacing, typography, responsive behavior, and interaction notes.
- [ ] Screenshots or prototype data are clearly marked as simulated/demo content.

## 15. Critical Defect Classification

| Severity | Examples                                                                                                                                          | Release rule                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Blocker  | Cross-tenant data could appear; critical action available to unauthorized role; stale data presented as healthy; simulator data presented as real | Must fix before sign-off                                   |
| Critical | Core P0 journey cannot complete; data loss on normal form error; alert/incident/work-order relationship is misleading                             | Must fix before affected feature implementation/pilot      |
| Major    | Responsive layout blocks task; required state missing; important information not visible                                                          | Fix before design sign-off or document approved mitigation |
| Minor    | Cosmetic alignment, small spacing inconsistency, non-blocking typography issue                                                                    | May be tracked if not accessibility/legibility-related     |

## 16. Design Review Procedure

1. **Product review:** Confirm that screens and actions match the PRD and MVP scope.
2. **Role review:** Walk through the P0 flows as Owner, Manager, Engineer, Technician, and Viewer.
3. **Data review:** Test live, stale, no-data, simulator-paused, and offline representations.
4. **Accessibility review:** Keyboard, contrast, semantic labels, reduced motion, and chart alternatives.
5. **Responsive review:** Inspect defined breakpoints and long-content cases.
6. **Engineering review:** Check feasibility, route coverage, component reuse, and data dependencies.
7. **Sign-off:** Record accepted version, unresolved questions, owners, and target resolution dates.

## 17. Required Sign-Off Record

| Reviewer          | Responsibility                        | Status  | Date | Notes |
| ----------------- | ------------------------------------- | ------- | ---- | ----- |
| Product Owner     | Scope, user value, priority           | Pending | —    | —     |
| UX/UI Designer    | IA, flows, visual system, interaction | Pending | —    | —     |
| Frontend Engineer | Component and responsive feasibility  | Pending | —    | —     |
| Backend Engineer  | Permission and state feasibility      | Pending | —    | —     |
| QA / Test Owner   | Testability and acceptance coverage   | Pending | —    | —     |

## 18. Design Phase Exit Criteria

The UX/UI design phase is complete when:

- All Must-pass criteria above are satisfied for the P0 scope.
- All P0 screens are represented in Figma.
- All P0 user flows have a clickable prototype or an equivalent reviewable interaction map.
- Design tokens and component states are documented.
- All critical responsive, accessibility, permission, and data-freshness states are covered.
- Product and engineering reviewers have recorded sign-off.
- Unresolved items are explicitly listed and do not block safe implementation.

---

**Document owner:** Product / UX Design  
**Review status:** Proposed acceptance standard; requires team review before final sign-off.
