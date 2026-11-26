# GridAware — Brand Color Foundation

**Document version:** 1.0  
**Status:** Initial color direction approved by product owner; semantic usage requires design review  
**Palette source/name:** EVARAX Color Palette (provided by product owner)  
**Applies to:** GridAware web application design exploration  
**Related documents:** `information-architecture.md`, `sitemap.md`

---

## 1. Purpose

This document records the exact color palette selected for GridAware and defines an initial, consistent usage direction for the UX/UI design phase.

The supplied palette is the brand foundation. This document does not attempt to finalize the complete design system. Semantic feedback colors, chart series, surface elevation, hover states, focus indicators, and light-theme support will be reviewed during the dedicated Design System step.

## 2. Approved Brand Palette

| Color name    | HEX       | Initial role                                                                          |
| ------------- | --------- | ------------------------------------------------------------------------------------- |
| Soft Yellow   | `#F4E952` | Primary brand accent; key highlights and selected emphasis                            |
| Neon Lime     | `#F6FA45` | Secondary high-energy accent; active indicators and selected UI emphasis              |
| Golden Yellow | `#FCCE35` | Warm accent; secondary emphasis and caution-oriented visual accents where appropriate |
| Near Black    | `#080808` | Primary dark canvas and brand base                                                    |
| Cool White    | `#E9ECF2` | Primary text on dark surfaces and high-contrast content                               |
| Pure White    | `#FFFFFF` | Maximum-contrast text, icons, and selected surfaces                                   |

The palette values must be used exactly as supplied. Do not silently shift hues or replace them with close approximations.

## 3. Initial Visual Direction

GridAware should feel like a premium industrial SaaS product: precise, technical, confident, and readable during long operational sessions.

The intended visual characteristics are:

- Dark-first interface based on Near Black.
- Cool White for normal text and information density.
- Yellow/lime accents used intentionally rather than everywhere.
- Strong hierarchy between page titles, operational data, secondary metadata, and status indicators.
- Restrained use of glow, gradients, and high-saturation fills.
- Data visualizations optimized for legibility rather than decoration.

The UI should not resemble a gaming dashboard or use neon effects around every component. Accent colors are most effective when used sparingly.

## 4. Recommended Color Roles

### 4.1 Brand roles

| Role                  | Token proposal            | Value     |
| --------------------- | ------------------------- | --------- |
| Brand primary         | `--color-brand-primary`   | `#F4E952` |
| Brand secondary       | `--color-brand-secondary` | `#F6FA45` |
| Brand tertiary        | `--color-brand-tertiary`  | `#FCCE35` |
| Canvas                | `--color-canvas`          | `#080808` |
| Text primary          | `--color-text-primary`    | `#E9ECF2` |
| Text maximum contrast | `--color-text-inverse`    | `#FFFFFF` |

### 4.2 Initial application usage

| UI element               | Recommended treatment                                       | Notes                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main app background      | Near Black                                                  | Use as the foundational canvas.                                                                                                                                  |
| Sidebar background       | Near Black or a subtle derived dark surface                 | Separate from content through border/elevation, not a bright panel.                                                                                              |
| Primary body text        | Cool White                                                  | Use for long-form and high-density information.                                                                                                                  |
| Strong headings          | Pure White or Cool White                                    | Keep hierarchy primarily typographic.                                                                                                                            |
| Primary CTA              | Soft Yellow background with Near Black text                 | Use for the most important page action. Verify states and contrast in the final component.                                                                       |
| Secondary CTA            | Transparent/dark surface with Soft Yellow border/text       | Avoid competing with the primary action.                                                                                                                         |
| Selected navigation item | Subtle dark surface plus Soft Yellow or Neon Lime indicator | Do not fill the entire sidebar with neon.                                                                                                                        |
| Focus/active accent      | Neon Lime                                                   | Must also use shape/outline, not color alone.                                                                                                                    |
| Secondary highlight      | Golden Yellow                                               | Use for selected data emphasis, not automatically as the warning semantic.                                                                                       |
| Data values              | Cool White                                                  | Brand colors can highlight key readings selectively.                                                                                                             |
| Dividers/borders         | Derived neutral dark values                                 | The six supplied brand colors do not include enough neutral steps for all surfaces. Derive neutral surfaces carefully and record them in the full Design System. |

## 5. Dark Surface Strategy

The supplied palette contains one dark neutral and two light neutrals. A usable dark application requires intermediate surfaces for cards, inputs, menus, borders, hover states, and overlays.

For the first wireframe/high-fidelity exploration, use derived neutral values as provisional UI surfaces, not as new brand colors:

| Provisional token | Suggested value | Usage                                                           |
| ----------------- | --------------- | --------------------------------------------------------------- |
| `--surface-1`     | `#101010`       | Sidebar sections/cards slightly above the canvas                |
| `--surface-2`     | `#171717`       | Inputs, elevated cards, dropdowns                               |
| `--surface-3`     | `#202020`       | Hover/active neutral surface                                    |
| `--border-subtle` | `#2A2A2A`       | Dividers and low-emphasis outlines                              |
| `--border-strong` | `#414141`       | Higher-emphasis boundaries                                      |
| `--text-muted`    | `#A3A7B0`       | Secondary metadata; validate contrast before use for small text |

These are provisional neutral derivatives and should be reviewed in the Design System. Do not represent them as part of the original EVARAX palette.

## 6. Contrast and Accessibility Notes

Approximate WCAG contrast ratios calculated from the supplied HEX values:

| Foreground              | Background           | Contrast ratio | Initial assessment          |
| ----------------------- | -------------------- | -------------: | --------------------------- |
| Soft Yellow `#F4E952`   | Near Black `#080808` |        15.85:1 | Strong contrast             |
| Neon Lime `#F6FA45`     | Near Black `#080808` |        17.81:1 | Strong contrast             |
| Golden Yellow `#FCCE35` | Near Black `#080808` |        13.37:1 | Strong contrast             |
| Cool White `#E9ECF2`    | Near Black `#080808` |        16.92:1 | Strong contrast             |
| Pure White `#FFFFFF`    | Near Black `#080808` |        20.03:1 | Strong contrast             |
| Near Black `#080808`    | Cool White `#E9ECF2` |        16.92:1 | Strong contrast             |
| Soft Yellow `#F4E952`   | Pure White `#FFFFFF` |         1.26:1 | Do not use as text on white |
| Neon Lime `#F6FA45`     | Pure White `#FFFFFF` |         1.12:1 | Do not use as text on white |
| Golden Yellow `#FCCE35` | Pure White `#FFFFFF` |         1.50:1 | Do not use as text on white |

These ratios are mathematical checks for the listed pairs, not a complete accessibility certification. Every component state must be checked individually, including hover, disabled, focus, selected, chart labels, tooltips, and overlays.

### 6.1 Rules

- Use Near Black text on yellow/lime fills.
- Do not use yellow/lime as small text on white backgrounds.
- Do not use color as the only way to communicate severity, status, or selection.
- Pair status colors with text labels, icons, shapes, and/or patterns.
- Ensure keyboard focus is always visible.
- Keep normal text at WCAG AA contrast or better for the relevant size and weight.
- Test chart grids, axes, legends, and tooltip text; data visualization contrast is often overlooked.

## 7. Brand Accent Is Not the Same as Operational Status

The supplied yellow/lime/gold palette is a brand palette. It must not be forced to represent every operational state.

In particular:

- Yellow does not automatically mean warning.
- Lime does not automatically mean healthy.
- Gold does not automatically mean critical.

GridAware needs distinct semantic states such as:

- Healthy / normal.
- Attention required.
- Critical.
- Offline / no data.
- Unknown / stale.
- Informational.

During the full Design System phase, define a separate semantic status system with accessible colors and non-color cues. The selected brand palette should remain visually recognizable while status colors remain unambiguous. If additional semantic colors are required, propose them explicitly for approval rather than silently altering the provided palette.

## 8. Data Visualization Guidance

The product is telemetry-heavy, so chart design must prioritize accurate interpretation.

Initial guidance:

- Use Cool White for primary axes and labels on dark chart surfaces.
- Use muted neutral grays for grid lines.
- Use Soft Yellow or Neon Lime for one key highlighted series, not every series.
- Use Golden Yellow as a secondary comparison/highlight where it remains distinguishable.
- Use line styles, point shapes, and labels in addition to color for multi-series charts.
- Avoid using three similar yellow hues as the only way to distinguish three sensor series.
- Make threshold lines visually different from telemetry series using line style and clear labels.
- Make anomaly points identifiable through marker shape and annotation, not just a color shift.
- Keep chart tooltips explicit about metric, value, unit, timestamp, and source.

Final chart colors will be selected during the Design System phase after representative telemetry charts are designed and tested.

## 9. Motion, Glow, and Effects

- Avoid persistent neon glow on text or card borders.
- Use subtle transitions for navigation, menus, selection, and live data updates.
- Do not flash critical status indicators continuously.
- Respect `prefers-reduced-motion` and provide a reduced-motion experience.
- Motion must never be the only way to communicate a state change.
- Use loading skeletons or restrained indicators rather than decorative animation.

## 10. CSS Variable Foundation

The following preserves the exact supplied palette and adds only provisional neutral surface tokens. The surface values are implementation placeholders pending full Design System approval.

```css
:root {
  /* EVARAX brand palette */
  --color-yellow: #f4e952;
  --color-lime: #f6fa45;
  --color-gold: #fcce35;
  --color-black: #080808;
  --color-off-white: #e9ecf2;
  --color-white: #ffffff;

  /* Provisional derived dark surfaces */
  --surface-1: #101010;
  --surface-2: #171717;
  --surface-3: #202020;
  --border-subtle: #2a2a2a;
  --border-strong: #414141;
  --text-muted: #a3a7b0;

  /* Initial semantic aliases */
  --color-brand-primary: var(--color-yellow);
  --color-brand-secondary: var(--color-lime);
  --color-brand-tertiary: var(--color-gold);
  --color-canvas: var(--color-black);
  --color-text-primary: var(--color-off-white);
  --color-text-inverse: var(--color-white);
}
```

## 11. Tailwind Mapping Direction

When the Design System is implemented, expose semantic tokens instead of scattering raw HEX values throughout components.

Example naming direction:

```text
bg-canvas
bg-surface-1
bg-surface-2
text-primary
text-muted
text-inverse
border-subtle
border-strong
bg-brand-primary
text-brand-primary
ring-brand-secondary
```

Component code should use semantic token names so a later theme adjustment does not require editing every component.

## 12. Palette Usage by Product Area

| Product area          | Recommended palette use                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| Dashboard             | Near Black canvas, Cool White data, Soft Yellow for primary emphasis, restrained Lime highlights   |
| Infrastructure tables | Neutral dark surfaces, Cool White text, Yellow for selected row/action emphasis                    |
| Live Monitoring       | Neutral chart base, Cool White labels, one accent series at a time, explicit threshold annotations |
| Alerts                | Use separate semantic severity mapping; brand accents may support selection/focus only             |
| Incidents             | Status labels and timeline use semantic status colors; yellow remains a brand accent               |
| Work Orders           | Neutral surfaces and strong typography; Soft Yellow for primary action                             |
| Analytics             | Consistent chart palette with non-color distinctions and accessible legends                        |
| Administration        | More restrained accent usage to prioritize clarity and data density                                |

## 13. Acceptance Criteria for the Color Foundation

- All six supplied HEX values are preserved exactly.
- Near Black is the initial primary canvas.
- Cool White is the default high-density text color on dark surfaces.
- Yellow, lime, and gold are accents, not large-area defaults.
- No yellow/lime text is placed on white surfaces for normal content.
- Brand accents are not confused with operational status semantics.
- Provisional neutral surfaces are clearly labeled as derived, not original brand colors.
- Focus, hover, selected, disabled, loading, and error states are considered before components are finalized.
- Contrast and color-blind usability are tested during Design System validation.

## 14. Open Questions for the Design System Phase

- Will GridAware remain dark-only for the MVP, or will a light theme be required?
- Should Soft Yellow or Neon Lime be the single primary CTA accent? Initial recommendation: Soft Yellow for primary CTA, Neon Lime for secondary active emphasis.
- Which additional semantic status colors are acceptable for healthy, warning, critical, offline, and informational states?
- Which chart series palette provides enough distinguishability for multiple sensor signals?
- What exact neutral surface scale should be adopted after testing against real screen density?

---

**Next design activity:** Apply this brand foundation to wireframe/high-fidelity exploration only after the navigation and screen inventory are approved. The full component-level Design System remains a later deliverable.
