# GridAware — Design Documentation

**Documentation version:** 1.2  
**Baseline:** GridAware Product Discovery / PRD v1.0  
**Product:** Multi-tenant B2B SaaS for infrastructure monitoring and predictive maintenance  
**Initial segments:** Factories and commercial buildings  
**Initial data mode:** Simulator only  
**First vertical slice:** Simulated generator telemetry → monitoring → anomaly/alert → incident → work order  
**Brand direction:** EVARAX, dark-first

---

## 1. Purpose

This directory is the design specification source for GridAware. It defines information architecture, navigation, user journeys, screens, visual foundations, responsive behavior, accessibility, data visualization, alert UX, simulator experience, component behavior, content language, Figma handoff, and design acceptance criteria.

These documents are specifications for design and implementation. They do not claim that Figma screens, prototypes, or production UI have already been created. Figma status should be tracked separately using the statuses defined in `figma-handoff-guidelines.md`.

## 2. Approved product baseline

| Decision                 | Baseline                                                       |
| ------------------------ | -------------------------------------------------------------- |
| Product                  | GridAware — Infrastructure Monitoring & Predictive Maintenance |
| Business model           | Multi-tenant B2B SaaS                                          |
| Initial market           | Factories and commercial buildings                             |
| Initial source           | Simulator only                                                 |
| First equipment workflow | Simulated generator                                            |
| Backend context          | NestJS + TypeScript; design remains implementation-agnostic    |
| Database context         | Neon PostgreSQL + Prisma ORM                                   |
| AI context               | Python services; ML capability phased after telemetry workflow |
| Brand palette            | EVARAX source colors supplied by product owner                 |
| Visual direction         | Dark-first operational SaaS                                    |
| Accessibility target     | WCAG 2.2 Level AA design target                                |

## 3. Full document index

### Product structure and journeys

| File                                 | Purpose                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `information-architecture.md`        | Product domains, hierarchy, navigation and information model                         |
| `application-shell-specification.md` | Sidebar, top bar, tenant/site context, global search and page framing                |
| `sitemap.md`                         | Public, onboarding, authenticated and internal route inventory                       |
| `user-flows.md`                      | User journeys, preconditions, alternate paths, permissions and completion conditions |
| `screen-inventory.md`                | Screen inventory with roles, content, actions, states and priorities                 |

### Wireframes and visual system

| File                          | Purpose                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `wireframe-specifications.md`  | Screen layout, hierarchy, responsive structure and wireframe states           |
| `brand-logo-brief.md`          | Brand discovery brief, category research, word map and logo concept selection |
| `brand-identity-guidelines.md` | Approved Node G logo system, clear space, EVARAX usage, pattern and shell fit |
| `brand-color-foundation.md`    | Immutable EVARAX source palette and proposed semantic mapping                 |
| `design-system.md`            | Color, typography, spacing, radius, surfaces, motion and base component rules |
| `component-catalog.md`        | Component families, variants, states, and implementation-facing inventory     |

### Interaction and experience quality

| File                                | Purpose                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `interaction-specifications.md`     | Form, table, dialog, navigation, feedback and real-time interaction behavior         |
| `responsive-design-guidelines.md`   | Desktop, tablet, mobile, page transformations and viewport testing                   |
| `accessibility-specification.md`    | WCAG 2.2 AA target, keyboard, screen reader, contrast and test plan                  |
| `content-design-and-terminology.md` | Product vocabulary, status labels, microcopy, AI language and localization readiness |

### Operational domain UX

| File                               | Purpose                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `data-visualization-guidelines.md` | Telemetry charts, units, thresholds, anomalies, predictions, freshness and time handling |
| `alert-notification-ux.md`         | Alert taxonomy, severity, acknowledgement, notification and escalation patterns          |
| `simulation-experience.md`         | Simulator console, scenario states, fault injection, data labeling and demo workflow     |

### Delivery and approval

| File                            | Purpose                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `figma-handoff-guidelines.md`   | Figma page structure, naming, variants, annotations, prototype and engineering handoff |
| `design-acceptance-criteria.md` | Review gates, design quality criteria and sign-off requirements                        |

## 4. Recommended reading order

1. `information-architecture.md`
2. `application-shell-specification.md`
3. `sitemap.md`
4. `user-flows.md`
5. `screen-inventory.md`
6. `simulation-experience.md`
7. `wireframe-specifications.md`
8. `brand-color-foundation.md`
9. `brand-logo-brief.md`
10. `brand-identity-guidelines.md`
11. `design-system.md`
12. `component-catalog.md`
13. `data-visualization-guidelines.md`
14. `alert-notification-ux.md`
15. `interaction-specifications.md`
16. `responsive-design-guidelines.md`
17. `accessibility-specification.md`
18. `content-design-and-terminology.md`
19. `figma-handoff-guidelines.md`
20. `design-acceptance-criteria.md`

## 5. EVARAX color baseline

The following source colors are fixed and must remain exact:

| Name          | HEX       |
| ------------- | --------- |
| Soft Yellow   | `#F4E952` |
| Neon Lime     | `#F6FA45` |
| Golden Yellow | `#FCCE35` |
| Near Black    | `#080808` |
| Cool White    | `#E9ECF2` |
| Pure White    | `#FFFFFF` |

Additional neutral surfaces and operational status colors are derived/proposed tokens, not new EVARAX brand colors. Their use must be reviewed for contrast and semantic clarity. Yellow/lime are accents, not default large-area backgrounds.

## 6. Product guardrails

- The initial release uses simulator-generated data only.
- Simulator-generated records must be visibly labeled `SIMULATED` or `DEMO DATA` throughout the experience.
- The first complete workflow is a simulated generator.
- The platform structure supports factories and commercial buildings, but equipment categories are phased.
- Live field-device integration is not part of the initial simulator-only scope.
- Advanced failure prediction, digital twins, direct equipment control, and advanced root-cause analysis are not implied to exist in the MVP.
- Missing, stale, invalid, or unavailable telemetry must never be presented as healthy.
- Anomaly event, alert, notification, and incident are distinct domain concepts.
- AI scores must not be presented as calibrated probabilities unless the model is validated and calibrated.
- The application is monitoring and decision-support software, not an equipment control or safety-protection system.

## 7. Design status and governance

Each document is a specification baseline. Figma frames should use `Exploration`, `Draft`, `In Review`, `Approved`, `Implemented`, or `Deprecated` status. A Markdown document being complete does not mean the screen has been designed or implemented.

When a design decision changes product behavior or scope:

1. Identify the affected PRD requirement/user story.
2. Record the proposed change and reason.
3. Review access, data, and workflow consequences.
4. Update this design documentation.
5. Obtain product-owner approval before implementation.

## 8. External standard

Accessibility target: WCAG 2.2 Level AA. Official reference: https://www.w3.org/TR/WCAG22/ . This is a target for design and implementation; it is not a claim of achieved conformance.

## 9. Definition of UX/UI design completion

The design phase is ready for frontend handoff when:

- Information architecture and routes are reviewed and approved.
- Core user flows are prototyped.
- MVP screens and states are inventoried.
- Low-fidelity wireframes are reviewed.
- High-fidelity screens use approved EVARAX tokens.
- Required components and variants are documented.
- Responsive behavior is defined.
- Accessibility and content standards are reviewed.
- Operational chart and alert semantics are approved.
- Simulator experience is clearly separated from physical equipment control.
- Figma handoff package and design QA checklist are complete.
