# GridAware — Spacing & Layout System

**Document version:** 1.0  
**Status:** Proposed foundation specification — validate in Figma before implementation  
**Product baseline:** GridAware PRD v1.0 / UX Design Documentation v1.3  
**Brand foundation:** EVARAX palette  
**Primary product mode:** Dark-first, multi-tenant B2B SaaS  
**Primary use cases:** Infrastructure monitoring, asset management, telemetry, incidents, and maintenance  
**Related documents:** `design-system.md`, `typography-system.md`, `responsive-design-guidelines.md`, `application-shell-specification.md`, `wireframe-specifications.md`, `component-catalog.md`, `data-visualization-guidelines.md`, `accessibility-specification.md`, `design-acceptance-criteria.md`

---

## 1. Purpose

This document defines the spatial rules that govern the GridAware interface: spacing, page containers, application shell dimensions, grids, component sizing, content density, and responsive layout behavior.

The objective is not to make every page look identical. It is to ensure that every page feels like part of the same product, that operational information is easy to scan, and that the interface remains predictable as users move between dashboards, asset details, telemetry views, incidents, and maintenance workflows.

GridAware is a data-dense operational application. It must present a meaningful amount of information without turning the interface into a crowded control panel. The layout system therefore balances three competing needs:

1. **Information density:** engineers and facility managers need to inspect many measurements, alerts, and assets.
2. **Readability:** data must remain legible and distinguishable, including during long monitoring sessions.
3. **Action clarity:** important actions must be easy to locate and must not be buried among secondary controls.

This specification establishes the default geometry for Figma and frontend implementation. The values are design tokens and starting constraints, not immutable values for every component. Any exception must be intentional, documented, and validated in context.

## 2. Design principles

### 2.1 Use a four-pixel base rhythm

The spacing system is based on a 4 px unit. Most spacing values should be multiples of four. This creates consistent alignment and makes the system easy to implement in Figma, CSS, and Tailwind.

A few values such as 20 px are included because they are useful for intermediate component spacing and still align with the four-pixel rhythm.

### 2.2 Separate layout spacing from component padding

Use layout spacing to define the distance between sections and components. Use component padding to define the internal breathing room of a card, dialog, form field, or table cell. Do not compensate for an incorrectly sized component by adding arbitrary margins around it.

### 2.3 Prefer fluid layout over fixed page widths

The main content area should use available space while respecting a readable maximum width. Avoid hardcoding the entire page to a single desktop width. Fixed dimensions are appropriate for shell elements such as the desktop sidebar, but the content canvas must adapt to the viewport.

### 2.4 Preserve operational hierarchy

The most important information should occupy the most visible position. On a typical asset or incident screen, identity and status come first, critical measurements and actions follow, and supporting history or metadata comes later.

### 2.5 Use density intentionally

Comfortable density is the default. Compact density may be used for high-volume tables and operational data views. Do not make the entire application compact simply because it contains a lot of data.

### 2.6 Do not use spacing to communicate status

Spacing communicates grouping and hierarchy. Status must be communicated using explicit text, iconography, and the approved semantic status colors. A larger gap, a yellow card, or a different alignment must not be the only indication that an asset is critical.

---

## 3. Spacing scale

### 3.1 Canonical spacing tokens

Use the following scale as the source of truth.

| Token      |  Value | Typical use                                                        |
| ---------- | -----: | ------------------------------------------------------------------ |
| `space-0`  |   0 px | No spacing; reset or edge alignment                                |
| `space-1`  |   4 px | Icon-to-label micro spacing, compact inline gaps                   |
| `space-2`  |   8 px | Related text rows, compact control gaps                            |
| `space-3`  |  12 px | Form label-to-control, compact card internals                      |
| `space-4`  |  16 px | Default component gap, standard card padding in compact layouts    |
| `space-5`  |  20 px | Intermediate grouping and comfortable control spacing              |
| `space-6`  |  24 px | Standard card padding and section-internal spacing                 |
| `space-8`  |  32 px | Page section spacing and desktop content padding                   |
| `space-10` |  40 px | Large section separation                                           |
| `space-12` |  48 px | Major page grouping                                                |
| `space-14` |  56 px | Large visual separation when needed                                |
| `space-16` |  64 px | Major section or shell spacing                                     |
| `space-20` |  80 px | Large page-level separation                                        |
| `space-24` |  96 px | Exceptional marketing or empty-state spacing                       |
| `space-30` | 120 px | Exceptional hero composition only; not for routine product screens |

**Rules:**

- Prefer `space-1` through `space-8` for component-level spacing.
- Prefer `space-6` through `space-12` for page-level section separation.
- Use `space-14` and above sparingly.
- Do not create one-off values such as 13 px or 27 px to fix alignment. Revisit the component geometry first.
- Zero spacing should be an explicit choice, not an accidental omission.

### 3.2 CSS token definition

```css
:root {
  --space-0: 0px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-14: 56px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  --space-30: 120px;
}
```

### 3.3 Common spacing recipes

| Relationship                  |        Recommended spacing |
| ----------------------------- | -------------------------: |
| Icon to adjacent label        |                       8 px |
| Label to input                |                       8 px |
| Input to helper/error text    |                     4–8 px |
| Form field to next field      |                   16–20 px |
| Card title to card content    |                      16 px |
| Card internal padding         |                   20–24 px |
| Related cards in a grid       |                   16–24 px |
| Page title to page content    |                   24–32 px |
| Major page sections           |                   32–48 px |
| Dashboard grid row gap        |                   20–24 px |
| Table cell horizontal padding |                   12–16 px |
| Table cell vertical padding   | 12 px, adjusted by density |
| Dialog title to body          |                      16 px |
| Dialog body to footer         |                      24 px |

These are defaults. Dense data panels can use less space when the page remains readable and actions stay distinguishable.

---

## 4. Application shell geometry

### 4.1 Desktop shell

The following dimensions are the initial Figma baseline for desktop layouts.

| Shell element           | Expanded state |        Collapsed / compact state |
| ----------------------- | -------------: | -------------------------------: |
| Primary sidebar         |         256 px |                            72 px |
| Top application bar     |     64 px high |                       64 px high |
| Page horizontal padding |          32 px | 24 px where space is constrained |
| Page top padding        |          32 px | 24 px where space is constrained |
| Content max width       |        1600 px |                          1600 px |
| Utility drawer          | 400 px default |            360 px minimum target |

The sidebar is a stable shell region on desktop. Its width must not change from page to page. The collapsed state must preserve accessible names through tooltips or an equivalent labeled navigation affordance; icon-only navigation must not be the only way to identify a destination.

### 4.2 Content canvas

The content canvas should use a fluid width with a maximum width constraint:

```css
.page-canvas {
  width: 100%;
  max-width: 1600px;
  margin-inline: auto;
  padding-inline: 32px;
  padding-block: 32px 48px;
}
```

The max-width applies to the content area after the application shell. It does not include the sidebar. Pages such as live telemetry may use the full available content width because chart comparison benefits from horizontal space. Long-form settings and forms should use a narrower content column.

### 4.3 Page header layout

A standard page header should contain:

1. Breadcrumbs or parent context when useful.
2. Page title and concise description.
3. Primary action, if the page has one.
4. Secondary actions or overflow menu.
5. Optional page-level filters or date range controls.

The title and description form one text group. Actions should align to the opposite edge on wide desktop layouts. On narrower viewports, actions may move below the title or into a clearly labeled action menu.

Recommended spacing:

- Breadcrumb to title: 8–12 px.
- Title to description: 8 px.
- Header group to page body: 24–32 px.
- Primary to secondary action gap: 8–12 px.

### 4.4 Shell layering

The sidebar, top bar, page canvas, drawers, dialogs, and toasts must use a consistent stacking order. Define the actual z-index tokens in the design system; do not assign arbitrary z-index values per component. A modal must appear above drawers, and transient toasts must not cover modal actions or critical mobile controls.

---

## 5. Grid system

### 5.1 Responsive grid definitions

Use a 12-column grid for standard desktop layouts, an 8-column grid for tablet layouts, and a 4-column grid for mobile layouts.

| Viewport band               | Columns | Gutters |    Outer page padding |
| --------------------------- | ------: | ------: | --------------------: |
| Small mobile, 320–374 px    |       4 |   12 px |                 16 px |
| Standard mobile, 375–767 px |       4 |   16 px |                 16 px |
| Tablet, 768–1023 px         |       8 |   20 px |                 24 px |
| Desktop, 1024–1439 px       |      12 |   24 px |              24–32 px |
| Wide desktop, 1440 px+      |      12 |   24 px | 32 px, with max-width |

Use the breakpoint tokens already defined in `responsive-design-guidelines.md`:

```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}
```

Do not assume that the column count alone determines a good layout. At intermediate widths, inspect the actual minimum widths of cards, charts, and tables. A component may need to span more columns or move to another row before the formal breakpoint is reached.

### 5.2 CSS grid baseline

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 24px;
}

@media (max-width: 1023px) {
  .dashboard-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 20px;
  }
}

@media (max-width: 767px) {
  .dashboard-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }
}
```

Use `minmax(0, 1fr)` to prevent long content from forcing grid tracks wider than the available container. Apply `min-width: 0` to grid children that contain charts, text, or tables with potentially long values.

### 5.3 Dashboard grid patterns

Recommended desktop patterns:

| Pattern                       | Suggested allocation  | Use                                                   |
| ----------------------------- | --------------------- | ----------------------------------------------------- |
| Four KPI cards                | 3 / 3 / 3 / 3 columns | Total assets, healthy assets, alerts, offline sensors |
| Main chart + supporting panel | 8 + 4 columns         | Health or telemetry trend with context panel          |
| Two equal charts              | 6 + 6 columns         | Site comparison and equipment distribution            |
| Full-width data table         | 12 columns            | Asset list, incidents, work orders                    |
| Full-width timeline           | 12 columns            | Incident history or telemetry event history           |
| Three analysis panels         | 4 / 4 / 4 columns     | Compact analytics summaries                           |

These are layout patterns, not mandatory page templates. Do not force every dashboard to contain the same cards. Use the actual user task and available data to decide which patterns belong on each page.

### 5.4 Content width rules

| Content type               |             Recommended max width |
| -------------------------- | --------------------------------: |
| Authentication form        |                        420–480 px |
| Standard form column       |                        560–640 px |
| Settings content           |                       880–1040 px |
| Reading / explanatory text |                        720–800 px |
| Detail page content        |                      1200–1600 px |
| Data-heavy monitoring view | Use available width up to 1600 px |

Avoid stretching paragraphs across the entire dashboard canvas. Avoid constraining telemetry charts so narrowly that axes, legends, and threshold labels become unreadable.

---

## 6. Component sizing

### 6.1 Buttons

| Variant     | Height | Horizontal padding | Intended use                                         |
| ----------- | -----: | -----------------: | ---------------------------------------------------- |
| Compact     |  32 px |              12 px | Dense table actions or compact toolbars              |
| Default     |  40 px |              16 px | Standard application actions                         |
| Comfortable |  44 px |           16–20 px | Frequent touch or primary workflow actions           |
| Large       |  48 px |           20–24 px | Prominent onboarding or high-importance form actions |

Icon-only buttons must have a sufficiently large interactive hit area even if the icon itself is 16–20 px. Use a minimum 40 px target for common controls, and aim for 44 px on touch-first interactions. This product target is intentionally more generous than the minimum WCAG 2.2 AA target-size criterion in cases where that criterion applies.

### 6.2 Form controls

| Control                 | Standard height / sizing                            |
| ----------------------- | --------------------------------------------------- |
| Text input              | 40 px                                               |
| Select                  | 40 px                                               |
| Search field            | 40 px; 44 px in prominent mobile contexts           |
| Textarea                | Minimum 96 px; grows with content where appropriate |
| Checkbox / radio visual | 16–18 px with a larger interactive hit area         |
| Switch                  | 20–24 px visual height; larger hit area             |
| Date range control      | 40 px minimum                                       |

A form field group includes label, control, helper or error text, and any optional hint. Keep label and helper text close to the control they describe. Do not use placeholder text as a replacement for a visible label.

### 6.3 Cards and panels

| Component type                  | Default padding | Notes                                          |
| ------------------------------- | --------------: | ---------------------------------------------- |
| Standard information card       |        20–24 px | Main dashboard and detail content              |
| Compact metric card             |           16 px | KPI groups and compact panels                  |
| Dense data panel                |        12–16 px | Operational tables and event lists             |
| Large feature / onboarding card |        24–32 px | Use sparingly in the operational application   |
| Chart card                      |        20–24 px | Keep header, chart, and footer groups distinct |

Cards should not be nested unnecessarily. If a chart already sits inside a card, avoid placing it inside another decorative card unless the second level expresses a real grouping or interaction boundary.

### 6.4 Tables

| Density        | Row height target | Vertical cell padding | Use                                 |
| -------------- | ----------------: | --------------------: | ----------------------------------- |
| Comfortable    |          52–56 px |              14–16 px | General tables and first-time users |
| Compact        |          44–48 px |              10–12 px | High-volume operational lists       |
| Touch-friendly |          56–64 px |              16–20 px | Tablet / mobile task lists          |

Table column widths should be based on content priority. Asset name, status, site, and freshness should remain easy to find. Secondary metadata may move into row details or a detail panel on smaller screens. Never reduce font size solely to fit more columns.

### 6.5 Dialogs, drawers, and popovers

| Surface                   | Suggested width | Guidance                                       |
| ------------------------- | --------------: | ---------------------------------------------- |
| Small confirmation dialog |      400–480 px | One short decision and clear actions           |
| Standard dialog           |      560–640 px | Forms or focused details                       |
| Large dialog              |      720–800 px | Complex but contained workflows                |
| Side drawer               |      360–420 px | Contextual details and filters                 |
| Wide detail drawer        |      480–560 px | Investigation context or multi-section details |
| Popover                   |      240–360 px | Short contextual controls only                 |

On small screens, dialogs and drawers should adapt to the viewport, often becoming near-full-screen sheets. They must not extend beyond the visible viewport or hide keyboard focus.

### 6.6 Icons and icon-label spacing

- Standard inline icon: 16 px.
- Standard button / navigation icon: 18–20 px.
- Large empty-state or feature icon: 24–32 px.
- Icon-to-label gap: 8 px.
- Icon-to-icon control gap: 8 px minimum unless a validated compact pattern is required.

Icon size describes the visible glyph, not the interactive target. Interactive targets must remain larger than the glyph.

---

## 7. Page templates

### 7.1 Overview / dashboard page

A typical dashboard page follows this vertical structure:

1. Page header: title, short context, date range or primary action.
2. KPI strip: four key indicators where the viewport supports it.
3. Primary analysis row: main chart plus supporting panel.
4. Secondary analysis row: distribution, comparison, or risk summary.
5. Operational lists: critical assets, open incidents, or recent activity.

Use 24 px gaps within dashboard rows and 32 px between major groups. At tablet widths, use fewer columns and stack panels when chart or table content becomes constrained. On mobile, prioritize the most important operational summaries and task actions.

### 7.2 List / table page

1. Page header and primary action.
2. Search, filters, sort, and view controls.
3. Result count and active filter summary.
4. Data table or responsive cards.
5. Pagination or incremental loading controls.

Filters should not be scattered across multiple unrelated rows. Group them into one toolbar or a filter drawer. On narrow screens, present active filters clearly so users understand why results are limited.

### 7.3 Detail page

1. Breadcrumb / parent context.
2. Identity header with asset or incident name and status.
3. Primary action group.
4. Key facts or metric strip.
5. Main content sections.
6. Supporting history, audit, related records, or activity timeline.

The identity header should remain visually separate from the data panels below it. Do not repeat the same status badge in every section unless it conveys a different state.

### 7.4 Form / setup page

- Place the form in a readable column, generally 560–640 px wide.
- Group related fields into labeled sections.
- Use 16–20 px between field groups and 24–32 px between major form sections.
- Keep required-field and validation guidance close to the affected control.
- Use a persistent or clearly visible action area for long forms, but do not cover the last field or keyboard focus.
- Explain irreversible actions before the user commits them.

### 7.5 Live monitoring page

- Use the full available content width up to the defined maximum.
- Keep asset identity, connection state, and data freshness visible near the top.
- Arrange charts in a grid based on the number of active metrics and comparison needs.
- Use a consistent chart-card header height and plot-area alignment when charts are compared side by side.
- Keep time range and metric selection controls grouped.
- Avoid layout movement when new telemetry arrives; update chart data without changing card geometry.

### 7.6 Simulator console

The simulator is an explicit demo/development capability in the first release, not a production device control panel. Its layout should group:

1. Scenario selection.
2. Scenario parameters.
3. Start / pause / stop actions.
4. Current simulation state and elapsed time.
5. Generated telemetry preview.
6. Event log and fault-injection history.

Keep simulator controls visually distinct from real equipment controls. All simulated data must remain clearly labeled as simulated.

---

## 8. Responsive layout behavior

Use the detailed breakpoint and device behavior defined in `responsive-design-guidelines.md`. This section establishes the spatial rules that complement it.

| Band         | Page horizontal padding | Grid columns | Grid gap | Main behavior                                               |
| ------------ | ----------------------: | -----------: | -------: | ----------------------------------------------------------- |
| 320–374 px   |                   16 px |            4 |    12 px | Single-column content; compact spacing                      |
| 375–767 px   |                   16 px |            4 |    16 px | Single-column pages and card-based data lists               |
| 768–1023 px  |                   24 px |            8 |    20 px | Selective two-column layouts; collapsed / drawer navigation |
| 1024–1439 px |                24–32 px |           12 |    24 px | Full operational layout; sidebar behavior per shell spec    |
| 1440 px+     |                   32 px |           12 |    24 px | Wider canvas with max-width constraint                      |

### Responsive transformation rules

- Do not scale down all desktop spacing proportionally. Reflow the content according to the task.
- KPI grids should move from four columns to two, then one or two compact columns based on actual card width.
- Multi-chart layouts should stack or switch to a metric selector before axes and legends become cramped.
- Tables should hide secondary columns or transform to cards; do not simply shrink every column.
- Filters should move into a drawer or compact panel on mobile.
- Primary actions must remain visible and reachable.
- Preserve the order of important information when the layout changes.

### Minimum component width checks

During wireframing and implementation, test at least these widths: 320, 375, 430, 768, 820, 1024, 1100, 1280, 1366, 1440, and 1920 px. The 820 px and 1100 px checks are included to expose awkward intermediate states not covered by named breakpoints.

---

## 9. Density modes

GridAware supports two intentional density modes in the design language. Whether users can switch modes in the MVP is a separate product decision.

### 9.1 Comfortable (default)

- Standard card padding: 20–24 px.
- Table rows: 52–56 px.
- Input height: 40 px.
- Clear separation between sections.
- Default for dashboards, forms, details, and new users.

### 9.2 Compact (specialized)

- Standard panel padding: 12–16 px.
- Table rows: 44–48 px.
- Tighter toolbar spacing.
- Used for data-heavy asset lists, event logs, and monitoring workspaces when the user benefits from seeing more rows at once.

Compact mode must not reduce text below the approved typography scale or remove visible status and freshness information. Do not introduce a third ultra-compact mode in the MVP.

---

## 10. Data visualization layout constraints

Chart geometry is particularly important in GridAware because users may compare operating patterns across metrics and time ranges.

- Prefer chart cards with a consistent header and control area.
- Typical compact chart card plot area: 180–240 px high.
- Standard time-series chart plot area: 240–320 px high.
- Detailed investigation chart: 320–420 px high when the analysis requires more temporal context.
- Keep chart legends outside the plot area when they would obscure data.
- Leave enough room for axis labels, units, threshold lines, anomaly markers, and tooltips.
- Avoid placing more than a few dense charts in one row.
- Keep metric names and units visible even when the chart is collapsed or summarized.
- Provide an accessible text or table alternative for essential values.

These heights are initial design targets. The final chart height depends on the actual chart type, number of series, label length, and viewport.

See `data-visualization-guidelines.md` for chart behavior, semantics, threshold treatment, and data-quality rules.

---

## 11. RTL and localization considerations

The initial product direction is English-first, but the layout system must not block Arabic localization.

- Use logical CSS properties such as `margin-inline`, `padding-inline`, `inset-inline-start`, and `text-align: start` where appropriate.
- Do not hardcode left/right alignment when the relationship should mirror in RTL.
- In RTL, mirror navigation placement and directional affordances where appropriate, but do not mirror charts, numeric axes, or time sequences automatically.
- Keep technical identifiers, serial numbers, timestamps, and numeric measurements legible with suitable direction isolation.
- Allow text containers to grow for longer translated labels.
- Validate mixed Arabic and Latin text, especially asset IDs and measurement strings.

The Arabic typeface and typography behavior are defined in `typography-system.md`.

---

## 12. Figma implementation guidance

### 12.1 Figma layout grids

Create layout grid presets for:

- Desktop: 12 columns, 24 px gutter, 32 px outer margin on wide desktop.
- Tablet: 8 columns, 20 px gutter, 24 px outer margin.
- Mobile: 4 columns, 12–16 px gutter, 16 px outer margin.

Use Auto Layout for component internals and page sections wherever practical. Use constraints and responsive variants for shell and page templates. Avoid manually nudging individual elements to simulate a spacing rule.

### 12.2 Figma variable collections

Create a `Spacing` variable collection with the canonical tokens from Section 3. Use semantic aliases only when they genuinely improve readability, for example:

- `layout/page-padding/desktop` → 32 px
- `layout/page-padding/tablet` → 24 px
- `layout/page-padding/mobile` → 16 px
- `component/card-padding/default` → 24 px
- `component/card-padding/compact` → 16 px
- `layout/grid-gap/default` → 24 px

Semantic aliases should reference primitive spacing tokens rather than duplicate raw values.

### 12.3 Naming conventions

Recommended variable and style names:

```text
Spacing / 0
Spacing / 1
Spacing / 2
Spacing / 3
Spacing / 4
Spacing / 5
Spacing / 6
Spacing / 8
Spacing / 10
Spacing / 12
Spacing / 14
Spacing / 16
Spacing / 20
Spacing / 24
Spacing / 30

Layout / Page Padding / Desktop
Layout / Page Padding / Tablet
Layout / Page Padding / Mobile
Layout / Grid Gap / Desktop
Layout / Grid Gap / Tablet
Layout / Grid Gap / Mobile
Component / Card Padding / Default
Component / Card Padding / Compact
```

### 12.4 Wireframe annotation

Wireframes should show layout dimensions where they affect implementation, including:

- Sidebar width and collapsed width.
- Top bar height.
- Page padding.
- Grid column spans.
- Card padding.
- Form column width.
- Table row density.
- Drawer and dialog width.
- Responsive stacking behavior.

Do not annotate every small gap on every frame. Use the shared tokens and annotate only exceptions or layout relationships that are not obvious from Auto Layout.

---

## 13. Frontend implementation guidance

### 13.1 CSS variables

The following variables are the initial implementation mapping:

```css
:root {
  --space-0: 0px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-14: 56px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  --space-30: 120px;

  --layout-sidebar-width: 256px;
  --layout-sidebar-collapsed-width: 72px;
  --layout-topbar-height: 64px;
  --layout-content-max-width: 1600px;

  --layout-page-padding-desktop: 32px;
  --layout-page-padding-tablet: 24px;
  --layout-page-padding-mobile: 16px;

  --layout-grid-gap-desktop: 24px;
  --layout-grid-gap-tablet: 20px;
  --layout-grid-gap-mobile: 16px;
}
```

### 13.2 Tailwind mapping

Map the spacing tokens into Tailwind's theme rather than scattering arbitrary pixel values throughout components. The exact configuration format depends on the installed Tailwind version; keep one canonical token source and expose aliases to Tailwind from it.

Example utility usage:

```tsx
<div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-6">
  <section className="min-w-0 rounded-xl p-4 xl:col-span-8 xl:p-6">
    {/* Primary chart */}
  </section>
  <aside className="min-w-0 rounded-xl p-4 xl:col-span-4 xl:p-6">
    {/* Supporting information */}
  </aside>
</div>
```

The example demonstrates the layout intent; actual color, border, and radius tokens are owned by the design system.

### 13.3 Avoid arbitrary-value drift

- Do not use arbitrary spacing values in routine components unless a documented exception requires them.
- Prefer shared tokens for padding, gap, margin, and layout widths.
- Keep component dimensions in the component API or shared styles, not repeated across pages.
- Use `min-width: 0` for grid children that contain variable data.
- Avoid fixed heights for content containers unless clipping or scrolling is explicitly part of the interaction.

---

## 14. Exceptions and special cases

Exceptions may be appropriate for:

- A full-bleed monitoring canvas.
- A high-density telemetry table.
- A full-screen simulator or investigation workspace.
- A mobile technician action panel.
- A marketing or authentication composition outside the operational shell.

Every exception must document:

1. The user task that requires the exception.
2. Why the standard layout is insufficient.
3. The affected viewport range.
4. Accessibility and scrolling implications.
5. How the exception will be tested.

Do not add one-off geometry because a screenshot looks more balanced. The decision must solve a real content or workflow need.

---

## 15. Acceptance criteria

The spacing and layout system is ready for approval when:

- [ ] All canonical spacing tokens are represented in Figma variables.
- [ ] Desktop, tablet, and mobile layout grids are defined.
- [ ] The application shell has consistent sidebar and top-bar dimensions.
- [ ] Page containers use consistent padding and a readable max-width.
- [ ] Dashboard patterns use documented grid spans and gaps.
- [ ] Forms and detail pages have readable content widths.
- [ ] Buttons, inputs, cards, tables, dialogs, and drawers use documented sizing.
- [ ] Comfortable and compact density are distinguished and used intentionally.
- [ ] Chart cards preserve space for axes, legends, thresholds, and data-quality indicators.
- [ ] Responsive transformations are designed, not merely scaled down.
- [ ] No page has unintended horizontal overflow at supported widths.
- [ ] RTL-ready layouts use logical alignment and spacing rules.
- [ ] Frontend implementation can consume the same tokens without copying arbitrary values.
- [ ] Any exception to the system is documented and reviewed.

---

## 16. Open decisions for Figma validation

The following items are initial recommendations and must be checked against actual screen layouts:

1. Whether the 256 px expanded sidebar remains comfortable with final navigation labels and organization context.
2. Whether the 1600 px content maximum is appropriate for all analytics and monitoring views.
3. Whether compact density should be a user preference in MVP or reserved for specific pages.
4. Whether the standard card padding should be 20 px or 24 px for the final component library.
5. Whether the simulator requires a full-width workspace at desktop sizes.
6. Whether some mobile technician actions need a sticky bottom action area.

These decisions should be resolved during low-fidelity wireframe review and recorded in `design-acceptance-criteria.md` before the high-fidelity UI is finalized.

---

## 17. Final principle

The GridAware layout system should make complex infrastructure information feel organized, calm, and actionable. Consistent spacing is not decoration; it is part of how the product communicates relationships, priority, and operational context.

**Use space to create hierarchy. Use density to support the task. Never sacrifice clarity just to fit more information on the screen.**
