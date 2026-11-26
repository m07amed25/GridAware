# GridAware — Design System Specification

**Document version:** 1.0  
**Status:** Proposed system for review; EVARAX source palette approved  
**Product baseline:** GridAware PRD v1.0  
**Related documents:** `brand-color-foundation.md`, `wireframe-specifications.md`, `interaction-specifications.md`  
**Primary theme direction:** Dark-first industrial SaaS  
**Design language:** EVARAX

---

## 1. Purpose

This document defines the proposed visual and behavioral foundation for GridAware's interface: color tokens, typography, spacing, layout, borders, elevation, iconography, data visualization, component standards, accessibility, and responsive behavior.

The six EVARAX colors supplied by the product owner are immutable brand inputs. Additional neutral and semantic tokens are proposed system colors, not replacements for the brand palette. Semantic operational states must be distinct from brand accents.

## 2. Design Principles

1. **Operational clarity over decoration.** Data and actions must remain the visual priority.
2. **Dark-first, not neon-everywhere.** Near Black is the base; yellow/lime are purposeful accents.
3. **Consistent semantics.** A status means the same thing across dashboard, list, detail, and notifications.
4. **Accessible by default.** Color is never the only signal; keyboard focus and readable contrast are mandatory.
5. **Information density with breathing room.** Industrial dashboards may be data-rich, but grouping and hierarchy must remain clear.
6. **Trustworthy data presentation.** Units, timestamps, freshness, source, and uncertainty must be explicit.
7. **Reusable components.** Patterns should be shared across pages rather than independently restyled.

## 3. Approved EVARAX Brand Palette

| Token               | Color name    | HEX       | Intended role                                 |
| ------------------- | ------------- | --------- | --------------------------------------------- |
| `--color-yellow`    | Soft Yellow   | `#F4E952` | Primary brand accent and principal CTA fill   |
| `--color-lime`      | Neon Lime     | `#F6FA45` | Secondary brand accent, active/focus emphasis |
| `--color-gold`      | Golden Yellow | `#FCCE35` | Tertiary accent and selected highlights       |
| `--color-black`     | Near Black    | `#080808` | Main canvas/background                        |
| `--color-off-white` | Cool White    | `#E9ECF2` | Primary text on dark surfaces                 |
| `--color-white`     | Pure White    | `#FFFFFF` | High emphasis text and selected surfaces      |

The HEX values above must remain exact. Do not add opacity or alter the original token values at source. Opacity variants may be derived as separate tokens only after visual review.

## 4. Neutral Surface Tokens

The original brand set does not contain enough neutral steps for a full dark UI. The following provisional neutral tokens are derived for application surfaces and must not be called EVARAX brand colors.

| Token              | Proposed value | Use                                                         |
| ------------------ | -------------- | ----------------------------------------------------------- |
| `--surface-canvas` | `#080808`      | Application canvas                                          |
| `--surface-1`      | `#101010`      | Sidebar and base containers                                 |
| `--surface-2`      | `#171717`      | Cards, inputs, menus                                        |
| `--surface-3`      | `#202020`      | Hovered/elevated neutral surfaces                           |
| `--surface-4`      | `#292929`      | Selected neutral surfaces where needed                      |
| `--border-subtle`  | `#2A2A2A`      | Dividers and low-emphasis boundaries                        |
| `--border-default` | `#363636`      | Standard card/input border                                  |
| `--border-strong`  | `#555555`      | Stronger boundaries and selected controls                   |
| `--text-primary`   | `#E9ECF2`      | Main text                                                   |
| `--text-strong`    | `#FFFFFF`      | High-emphasis text                                          |
| `--text-secondary` | `#B8BDC7`      | Secondary content                                           |
| `--text-muted`     | `#9298A3`      | Metadata; use only after contrast check                     |
| `--text-disabled`  | `#707680`      | Disabled labels; must not carry essential information alone |

Review these tokens against actual component mockups. Text contrast must be checked at the rendered size, weight, and background.

## 5. Semantic Operational Colors

The supplied EVARAX palette is a brand palette; it does not provide a complete and unambiguous operational status system. GridAware needs separate semantic tokens for equipment and workflow states.

Proposed starting values (subject to contrast and product-owner review):

| Semantic role       | Proposed token      | Proposed value | Meaning                               |
| ------------------- | ------------------- | -------------- | ------------------------------------- |
| Success             | `--status-success`  | `#35C58A`      | Confirmed successful/healthy state    |
| Warning             | `--status-warning`  | `#F0B84B`      | Attention required                    |
| Critical            | `--status-critical` | `#F06A6A`      | Critical condition / urgent attention |
| Informational       | `--status-info`     | `#65A9E8`      | Informational or neutral system event |
| Offline/Unavailable | `--status-offline`  | `#9AA1AC`      | No active connection / unavailable    |
| Unknown             | `--status-unknown`  | `#B3A4D8`      | State cannot be determined            |

These are proposed semantic colors, not final approved brand colors. They must be tested on `surface-1` and `surface-2`, with text/icon combinations, and approved before high-fidelity implementation.

### 5.1 Status wording

Do not use one status token for unrelated concepts. Keep separate labels for:

- Asset operational state.
- Device connection state.
- Telemetry freshness/data quality.
- Alert lifecycle state.
- Incident lifecycle state.
- Work-order lifecycle state.
- Simulator state.

Examples: `Operational`, `Device Offline`, `Data Stale`, `Alert Acknowledged`, `Incident Investigating`, `Work Order In Progress`, `Simulator Paused`.

### 5.2 Non-color cues

Every status badge must include a readable text label. Critical and warning states may also use distinct icons or shapes. Charts should include marker shapes or line styles when multiple series need differentiation.

## 6. CSS Variable Foundation

```css
:root {
  /* EVARAX brand palette — exact approved values */
  --color-yellow: #f4e952;
  --color-lime: #f6fa45;
  --color-gold: #fcce35;
  --color-black: #080808;
  --color-off-white: #e9ecf2;
  --color-white: #ffffff;

  /* Neutral dark surfaces — proposed */
  --surface-canvas: #080808;
  --surface-1: #101010;
  --surface-2: #171717;
  --surface-3: #202020;
  --surface-4: #292929;
  --border-subtle: #2a2a2a;
  --border-default: #363636;
  --border-strong: #555555;

  /* Text */
  --text-primary: #e9ecf2;
  --text-strong: #ffffff;
  --text-secondary: #b8bdc7;
  --text-muted: #9298a3;
  --text-disabled: #707680;

  /* Brand aliases */
  --brand-primary: var(--color-yellow);
  --brand-secondary: var(--color-lime);
  --brand-tertiary: var(--color-gold);

  /* Semantic status — proposed */
  --status-success: #35c58a;
  --status-warning: #f0b84b;
  --status-critical: #f06a6a;
  --status-info: #65a9e8;
  --status-offline: #9aa1ac;
  --status-unknown: #b3a4d8;
}
```

## 7. Typography

### 7.1 Typeface direction

Proposed primary UI typeface: **Geist Sans** or **Inter**. Choose one and use it consistently after checking available weights, rendering, licensing, and product performance. Proposed numeric/technical typeface: **Geist Mono** or a compatible monospace family for IDs, timestamps, and dense numeric values where alignment helps.

Do not mix multiple display fonts. The interface should feel precise and modern, not editorial or futuristic to the point of reducing readability.

### 7.2 Type scale proposal

| Token      | Size / line height | Use                                                         |
| ---------- | ------------------ | ----------------------------------------------------------- |
| `display`  | 32 / 40 px         | Rare page-level product headline, not every dashboard title |
| `h1`       | 28 / 36 px         | Main page title                                             |
| `h2`       | 22 / 30 px         | Major section heading                                       |
| `h3`       | 18 / 26 px         | Card/section heading                                        |
| `h4`       | 16 / 24 px         | Subsection title                                            |
| `body-lg`  | 16 / 24 px         | Main explanatory text                                       |
| `body`     | 14 / 21 px         | Standard UI text                                            |
| `body-sm`  | 13 / 19 px         | Dense table text and secondary content; verify readability  |
| `caption`  | 12 / 16 px         | Metadata only; not critical instructions                    |
| `overline` | 11 / 16 px         | Small uppercase labels, sparingly                           |

Avoid using tiny text for timestamps, sensor units, or status explanations. Dense operational content still needs to be readable.

### 7.3 Numeric typography

- Use tabular numerals for KPI values and measurement readings.
- Keep the unit visually associated with the value.
- Do not animate digits excessively.
- Use consistent decimal precision per metric.
- Preserve signs and explicit units for negative or unusual values.

## 8. Spacing, Layout, and Grid

### 8.1 Spacing scale

Use a 4px base with an 8px primary rhythm:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64` px.

Use 12px and 20px as intermediate values only where a component layout requires them. Avoid arbitrary values without a clear alignment reason.

### 8.2 Layout dimensions

| Token                        | Proposal       |
| ---------------------------- | -------------- |
| Sidebar expanded             | 248px          |
| Sidebar collapsed            | 72px           |
| Top bar                      | 64px           |
| Desktop page padding         | 32px           |
| Compact desktop page padding | 24px           |
| Tablet page padding          | 20px           |
| Mobile page padding          | 16px           |
| Standard card padding        | 20–24px        |
| Dense table row              | 52–60px target |

Validate dimensions with real content and long labels. Avoid fixed heights on containers that must support dynamic content.

### 8.3 Responsive breakpoints

Proposed breakpoints:

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

The exact framework breakpoints may differ; design behavior, not just the token values, must be documented.

## 9. Shape, Borders, and Elevation

### 9.1 Radius scale

| Token         |  Value | Usage                                    |
| ------------- | -----: | ---------------------------------------- |
| `radius-sm`   |    6px | Small controls, badges where appropriate |
| `radius-md`   |   10px | Inputs, buttons, compact cards           |
| `radius-lg`   |   14px | Cards and panels                         |
| `radius-xl`   |   18px | Large overlays and feature panels        |
| `radius-full` | 9999px | Pills, avatars, status dots              |

Keep the shape language restrained and consistent. Avoid excessive rounded-pill treatment on all controls.

### 9.2 Borders

- Use subtle borders to separate dark surfaces.
- Use a stronger border for focus, selected, or editable regions.
- Do not outline every nested container; use grouping and spacing first.
- Focus indicators must remain visible against both the base surface and the component fill.

### 9.3 Shadows

Use restrained elevation only for overlays, popovers, dialogs, and floating menus. The dark theme should rely primarily on surface contrast and borders rather than large blurred shadows or neon glow.

## 10. Component Standards

### 10.1 Buttons

Variants:

- Primary: Soft Yellow fill, Near Black text.
- Secondary: transparent/dark surface with neutral border and Cool White text.
- Tertiary/Ghost: no heavy fill; clear hover/focus state.
- Destructive: semantic critical treatment, not brand yellow.

Sizes: Small (32–36px), Medium (40px), Large (44–48px). Use one consistent height per context.

States: Default, hover, pressed, focus-visible, disabled, loading. Loading must prevent duplicate submissions and preserve the button label or provide clear progress text.

### 10.2 Inputs and selects

- Label above control.
- Placeholder must not replace the label.
- Clear focus-visible outline.
- Error message near field with text and icon where appropriate.
- Disabled state must be distinct from read-only.
- Required fields must be marked consistently.
- Long forms should group related fields and identify optional fields.

### 10.3 Cards and panels

- Use consistent padding and heading placement.
- KPI cards show label, value, unit/context, and optional comparison period.
- Avoid decorative mini-charts that have no defined interpretation.
- Cards that navigate must have an accessible interactive affordance.

### 10.4 Tables

- Header text must be clear and readable.
- Sorting state must be visible.
- Row actions must not conflict with row navigation.
- Primary columns remain visible at narrow widths; secondary values may move to a detail view.
- Status is shown as text plus visual marker.
- Skeletons preserve the overall table geometry.

### 10.5 Navigation

- Active item uses a subtle surface plus brand accent indicator.
- Icons must be consistent in size and stroke style.
- Collapsed navigation uses tooltips and accessible names.
- Parent group is expanded when a child route is active.
- Mobile navigation must preserve access to all P0 sections.

### 10.6 Dialogs and drawers

- Use dialogs for focused confirmation or short tasks.
- Use drawers for contextual detail that should preserve the underlying list.
- Use full pages for complex forms and multi-step workflows.
- Trap focus when modal; restore focus to the triggering control on close.
- Support Escape only when safe; do not silently discard unsaved changes.

### 10.7 Status badges

Every badge has a semantic label, color, and optional icon/shape. Do not use identical green/yellow/red colors to mean different states in different modules.

### 10.8 Toasts and inline feedback

- Toasts are for brief confirmation or non-blocking feedback.
- Validation errors appear inline.
- Critical system states remain visible in page context and cannot be communicated only by a transient toast.

## 11. Data Visualization System

GridAware is telemetry-heavy; chart design is a core product capability.

### 11.1 Chart principles

- Accurate axes and units.
- Consistent time zone handling.
- Clearly marked thresholds.
- Distinct telemetry series.
- Anomaly markers separate from raw data lines.
- Tooltips show timestamp, value, unit, quality, and source.
- Do not smooth data in ways that conceal real spikes unless the transformation is labeled.
- Missing values must appear as gaps or explicit missing-data indications, not interpolated healthy-looking lines by default.

### 11.2 Proposed series strategy

Use brand accents selectively:

- Soft Yellow: primary highlighted telemetry series.
- Neon Lime: secondary series or selected/focused series.
- Golden Yellow: comparison series or configured threshold only where contrast and meaning remain clear.

Use neutral grays for grid and secondary axes. Use separate semantic status colors for warnings/critical markers. If multiple metrics exceed available distinct colors, use small multiples, line styles, or separate panels rather than relying on similar yellow hues.

### 11.3 Chart interaction

- Hover and keyboard focus reveal exact points.
- Legend toggles visibility only when the state is discoverable and keyboard accessible.
- Zoom/pan controls must not hide the selected time range.
- Reset-to-default action is visible.
- Data freshness is shown outside the chart as well as in the tooltip.

## 12. Iconography and Imagery

- Use one consistent icon library and stroke weight.
- Icons supplement labels; do not use unlabeled unfamiliar icons for critical actions.
- Use icons for navigation, status, and action affordances consistently.
- Avoid decorative industrial stock imagery inside operational data pages.
- Illustrations may be used sparingly in empty states, but must not compete with the next action.

## 13. Motion and Feedback

- Use short, purposeful transitions for menus, drawers, tabs, and state changes.
- No continuous glow pulses for ordinary active states.
- Do not flash critical alerts continuously.
- Respect `prefers-reduced-motion`.
- Live readings may update with a subtle background/opacity cue but should not jump around the layout.
- Provide text feedback for all motion-based state changes.

## 14. Accessibility Requirements

Target WCAG 2.2 AA for applicable interface content and interactions.

- Text contrast meets AA for actual foreground/background combinations.
- Non-text controls and focus indicators have sufficient contrast.
- Full keyboard navigation for all P0 functionality.
- Visible focus state that is not hidden by sticky headers or overlays.
- Inputs have persistent labels and clear errors.
- Tables use semantic structure and understandable headers.
- Charts provide textual summaries or data alternatives for critical information.
- Status is never communicated by color alone.
- Touch targets should be large enough for mobile use; aim for 44×44 CSS px where practical.
- Reduced motion is respected.
- Screen readers receive meaningful labels, status announcements, and dialog context.

## 15. Tailwind / Component Token Mapping

Use semantic tokens in the application rather than scattering HEX codes throughout components.

Suggested naming:

```text
bg-canvas
bg-surface-1
bg-surface-2
bg-surface-3
text-primary
text-strong
text-secondary
text-muted
border-subtle
border-default
border-strong
bg-brand-primary
text-brand-primary
ring-brand-secondary
text-status-success
bg-status-warning-subtle
border-status-critical
```

The final token names should be implemented in one theme source and consumed by UI components. Components should not contain arbitrary one-off colors unless an exception is documented.

## 16. Design Token Ownership

| Token group            | Owner                         | Change rule                                    |
| ---------------------- | ----------------------------- | ---------------------------------------------- |
| EVARAX brand palette   | Product owner                 | Exact values cannot change without approval    |
| Neutral surfaces       | Design system owner           | May change after visual/contrast review        |
| Semantic status colors | Product + UX + engineering    | Must be reviewed for meaning and accessibility |
| Typography and spacing | UX design                     | Change via documented system revision          |
| Chart palette          | UX + data visualization owner | Must pass chart legibility review              |
| Component states       | UX + frontend                 | Must remain consistent across pages            |

## 17. Design System Acceptance Checklist

- [ ] Exact six EVARAX colors are preserved.
- [ ] Derived neutrals are documented as neutral tokens, not brand colors.
- [ ] Operational status colors are distinct from brand accents.
- [ ] Contrast is tested for text, controls, states, and chart labels.
- [ ] Typography scale and numeric styles are documented.
- [ ] Spacing, radius, borders, and elevation are consistent.
- [ ] Button/input/table/dialog states are defined.
- [ ] Responsive behavior is defined for all P0 components.
- [ ] Keyboard focus and reduced motion are supported.
- [ ] Chart behavior and non-color differentiation are documented.
- [ ] Tokens are available in a single implementation source.
- [ ] Figma styles/variables map to implementation token names.

---

**Document owner:** UX / Design System  
**Review status:** Proposed system; brand palette approved, semantic and neutral tokens pending final design review.
