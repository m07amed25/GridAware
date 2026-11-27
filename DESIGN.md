# GridAware — DESIGN.md

> **The single source of design truth for agents and engineers building GridAware's UI.**
> Consolidated from `docs/design/**`, `docs/product/target-users.md`, and `brand/**` (Node G identity kit, EVARAX palette).
> When this file and a source document disagree, see [§0.3 Resolved conflicts](#03-resolved-conflicts-between-source-docs). When in doubt, follow the **Non-negotiable rules** in §0.2.

| Field                   | Value                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| Product                 | **GridAware** — Infrastructure Monitoring & Predictive Maintenance                             |
| Model                   | Multi-tenant B2B SaaS (organizations = tenants)                                                |
| Segments                | Factories and commercial buildings                                                             |
| Data mode (MVP)         | **Simulator only** — no physical devices                                                       |
| First vertical slice    | Simulated generator telemetry → monitoring → anomaly/alert → incident → work order             |
| Brand / design language | **EVARAX**, dark-first industrial SaaS; logo **Node G** (Direction A, approved)                |
| Accessibility target    | **WCAG 2.2 Level AA** (target, not a claim of conformance)                                     |
| Frontend stack          | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4, in `client/`                |
| Backend                 | NestJS modular monolith in `server/`, REST at `/api/v1`, client on `:3000`, server on `:3001`  |
| Product nature          | **Monitoring & decision support only** — never equipment control or a safety-protection system |

---

## Table of contents

0. [Agent quick-start](#0-agent-quick-start)
1. [Brand essence & voice](#1-brand-essence--voice)
2. [Logo system — Node G](#2-logo-system--node-g)
3. [Color system](#3-color-system)
4. [Typography](#4-typography)
5. [Spacing, layout & grid](#5-spacing-layout--grid)
6. [Shape, borders, elevation, z-index](#6-shape-borders-elevation-z-index)
7. [Motion](#7-motion)
8. [Iconography & imagery](#8-iconography--imagery)
9. [Design tokens — implementation source](#9-design-tokens--implementation-source)
10. [Application shell](#10-application-shell)
11. [Information architecture & navigation](#11-information-architecture--navigation)
12. [Routes / sitemap](#12-routes--sitemap)
13. [Roles & permissions](#13-roles--permissions)
14. [Component catalog & specs](#14-component-catalog--specs)
15. [Interaction specifications](#15-interaction-specifications)
16. [Data states, telemetry & freshness](#16-data-states-telemetry--freshness)
17. [Data visualization](#17-data-visualization)
18. [Alerts, incidents, notifications](#18-alerts-incidents-notifications)
19. [Simulator experience](#19-simulator-experience)
20. [Screen inventory & page specs](#20-screen-inventory--page-specs)
21. [User flows](#21-user-flows)
22. [Responsive design](#22-responsive-design)
23. [Accessibility](#23-accessibility)
24. [Content design & terminology](#24-content-design--terminology)
25. [Localization & RTL](#25-localization--rtl)
26. [Figma handoff conventions](#26-figma-handoff-conventions)
27. [Acceptance criteria & defect classification](#27-acceptance-criteria--defect-classification)
28. [Asset file map](#28-asset-file-map)
29. [Open decisions](#29-open-decisions)
30. [Source index](#30-source-index)

---

## 0. Agent quick-start

### 0.1 If you only read one section

- Canvas is **Near Black `#080808`**. Body text is **Cool White `#E9ECF2`**. Primary CTA is **Soft Yellow `#F4E952` fill + `#080808` text**. Focus ring uses **Neon Lime `#F6FA45`** + shape/outline.
- Fonts: **Geist Sans** (UI) + **Geist Mono** (numbers, IDs, timestamps, units-bearing values). Already loaded in `client/app/layout.tsx` via `next/font/google`.
- Use **semantic tokens** (`bg-canvas`, `bg-surface-2`, `text-primary`, `status-critical`…), never raw HEX in components.
- Brand yellow is **not** a status color. Status colors: Success `#35C58A`, Warning `#F0B84B`, Critical `#F06A6A`, Info `#65A9E8`, Offline `#9AA1AC`, Unknown `#B3A4D8` — always with a **text label** (+ icon/shape).
- Sidebar **248px** expanded / **72px** collapsed, top bar **64px**, content max-width **1600px**, page padding **32/24/16px** (desktop/tablet/mobile). 4px base spacing grid.
- Every telemetry value shows **metric + value + unit + timestamp + freshness + source**. Missing ≠ zero ≠ healthy.
- Every simulator-derived context shows **`SIMULATED`** / **`DEMO DATA`**.
- Alert ≠ Incident ≠ Work order ≠ Notification ≠ Anomaly event. Never merge them.

### 0.2 Non-negotiable rules (blocker-level if violated)

1. The six EVARAX HEX values are **immutable**: `#F4E952`, `#F6FA45`, `#FCCE35`, `#080808`, `#E9ECF2`, `#FFFFFF`. No hue shifts, no "close enough" values. Opacity variants only as separate, reviewed tokens.
2. **Never** place yellow/lime/gold text or uncontained marks on `#FFFFFF` / `#E9ECF2` (contrast 1.12–1.50:1).
3. **Color is never the only signal.** Status, severity, selection, errors, read/unread — always text + icon/shape/pattern.
4. **Stale, offline, unknown, missing, or never-received data is never displayed as healthy.** Missing values are never rendered as `0`. Gaps stay gaps on charts.
5. **Simulated data is always labeled** (`SIMULATED` / `DEMO DATA`) on assets, charts, alerts, incidents, work orders, reports, screenshots.
6. **Simulator controls must never look like equipment controls.** Say "Start simulation", never "Start generator" / "Power on".
7. **Cross-tenant data must never appear**, even briefly, during organization switching. Clear tenant caches before rendering new tenant.
8. **Frontend visibility is not authorization.** Hide/disable for UX; backend enforces.
9. **AI outputs:** never show "probability" unless calibrated; say "Model score" / "Anomaly score"; state horizon; distinguish model-unavailable from low risk.
10. **No flashing, pulsing, or neon glow** for critical states or the logo. Respect `prefers-reduced-motion`.
11. **Do not recolor, reattach, rotate, mirror, stretch, outline, shadow, or re-type** the Node G logo.
12. Do not present P1/P2/later features (predictive failure, RUL, root-cause analysis, digital twins, physical devices, schedules automation) as available in the MVP.

### 0.3 Resolved conflicts between source docs

| Topic                    | Conflicting sources                                                                                                                                                                                                                                           | Resolution used here                                                                                                                                                                                                                             | Why                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI typefaces             | `brand-identity-guidelines.md` §6.2 & `design-system.md` §7: **Geist Sans + Geist Mono** (Inter / JetBrains Mono fallbacks). `typography-system.md`: **Space Grotesk + Inter + IBM Plex Mono + IBM Plex Sans Arabic** (status: _proposed, pending approval_). | **Geist Sans + Geist Mono** for all UI; **IBM Plex Sans Arabic** for Arabic only. Keep the semantic **type scale, weights, tracking and component styles** from `typography-system.md`. Display/page titles use Geist Sans 600 (with `-0.02em`). | Brand guidelines are _Approved_; typography doc is _Proposed_; the client already loads Geist. **Product-owner confirmation still recommended** (§29). |
| Sidebar expanded width   | `design-system.md`, brand guidelines, brand README: **248px**. Spacing doc: **256px**. Wireframes: 240–264px.                                                                                                                                                 | **248px**                                                                                                                                                                                                                                        | Logo placement math (20px pad, ~161px lockup, 67px right margin) is specified for 248px.                                                               |
| Wireframe spacing rhythm | Wireframes: 8px rhythm. Spacing doc / design system: 4px base, 8px primary rhythm.                                                                                                                                                                            | **4px base, 8px primary rhythm** (same thing).                                                                                                                                                                                                   | —                                                                                                                                                      |
| Top bar height           | Design system: 64px; wireframes: 64–72px.                                                                                                                                                                                                                     | **64px**                                                                                                                                                                                                                                         | Brand shell integration uses 64px.                                                                                                                     |
| Card padding             | 20–24px across docs (open decision).                                                                                                                                                                                                                          | **24px default, 16px compact**, 20px allowed.                                                                                                                                                                                                    | Figma alias `component/card-padding/default = 24`.                                                                                                     |
| Neutral surface tokens   | `brand-color-foundation.md` (`--border-strong #414141`, `--text-muted #A3A7B0`) vs `design-system.md` (`--border-strong #555555`, `--text-muted #9298A3`, adds `surface-4`, `border-default`, `text-secondary`, `text-disabled`).                             | **`design-system.md` values** (newer, superset).                                                                                                                                                                                                 | Design system is the later full spec.                                                                                                                  |
| Next.js public dir       | Docs say `apps/web/public/`. Repo uses `client/`.                                                                                                                                                                                                             | Copy web icons to **`client/public/`**.                                                                                                                                                                                                          | Monorepo decision (2026-11-26) keeps `client/` at root.                                                                                                |
| Route prefixes           | Sitemap: `/app/...`. Screen inventory: un-prefixed (`/dashboard`, `/sites`).                                                                                                                                                                                  | **Sitemap routes (`/app/...`, `/app/infrastructure/...`)** are canonical.                                                                                                                                                                        | Sitemap owns route mapping per screen inventory §1.                                                                                                    |
| Alert detail ack labels  | Interaction spec mentions "Acknowledge or dismiss". Alert UX lifecycle: OPEN → ACKNOWLEDGED → RESOLVED / SUPPRESSED.                                                                                                                                          | Use the **lifecycle in §18.4**; "dismiss" = policy-controlled suppression only.                                                                                                                                                                  | —                                                                                                                                                      |

---

## 1. Brand essence & voice

- **Brand idea:** _Vigilant clarity across the grid._ Every asset sits in an ordered operational structure; when one signal drifts out of baseline, GridAware surfaces it with context, ownership, and a traceable path to resolution.
- **Promise:** Turning infrastructure telemetry into actionable operational intelligence — spotting the one condition that needs attention and carrying it through to documented resolution.
- **Tagline:** _From equipment telemetry to actionable maintenance intelligence._
- **Adjectives:** **Precise · Structured · Vigilant · Calm · Traceable**
- **Avoid feeling:** Alarmist · Gaming-neon · Magical/black-box AI · Cluttered SCADA · Clip-art industrial.
- **Visual feel:** premium industrial SaaS; precise, technical, confident; readable in long operational sessions. Not a gaming dashboard. Accents used sparingly.
- **Editorial voice:** calm, direct, technically accurate, transparent about data freshness and model uncertainty. Never alarmist, exaggerated, or framed as autonomous equipment control.
- **Name spelling:** always **GridAware** (one word, capital G and A). Never `Gridware`, `Grid Aware`, `GRIDAWARE`; lowercase `gridaware` only in code slugs, CLI, MQTT topics, filenames.
- Proper terms capitalization: GridAware, EVARAX, MQTT, AI, API.
- **Primary audience:** Facility Managers, Maintenance Engineers, Organization Owners/Operations Directors, Field Technicians, read-only stakeholders. **Secondary:** technical evaluators, reliability engineers, software reviewers.
- **Off-limits brand clichés:** gears/wrenches/cogs/smokestacks/hardhats; ECG heartbeat zigzags; Wi‑Fi/broadcast ping rings; isometric hexagons/wireframe cubes; AI four-point sparkles or neural brain meshes; surveillance eyes or crosshairs; blue-SaaS camouflage (yellow is 0% in the monitoring category — GridAware owns it).

---

## 2. Logo system — Node G

### 2.1 Concept

A bold architectural **G** fused from **seven cells of a 3×3 modular grid** (_Grid_ — sites, buildings, bays). The **upper-right cell detaches** across orthogonal channels as a live **telemetry node** (_Aware_ — the one monitored asset needing attention). On dark: G frame + wordmark **Pure White `#FFFFFF`**, node only in **Soft Yellow `#F4E952`** (15.85:1 on `#080808`).

Rejected concepts (archived in `brand/concepts/`): Phase Shift (B), Focal Grid (C), Beacon Pylon, Threshold Frame, Busbar Datum, Interlock GA, Step Horizon, Awakened Quadrant, Diamond Eye, Orbit Arc.

### 2.2 Lockup suite (`brand/source/`, pure outlined vectors — no `<text>`, filters, masks, rasters)

| Variant                   | Use                                              | Dark-surface master                                                                                                        | Light-surface master                                                                      |
| ------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Horizontal lockup         | 248px sidebar, web headers, README, reports      | `gridaware-horizontal-dark.svg`                                                                                            | `gridaware-horizontal-badge-light.svg` (color) · `gridaware-horizontal-ink.svg` (1-color) |
| Stacked lockup            | Splash, signage, event badges, covers            | `gridaware-stacked-dark.svg`                                                                                               | `gridaware-stacked-ink.svg`                                                               |
| Standalone symbol (≥32px) | Avatars, doc callouts, stickers                  | `gridaware-symbol-dark.svg`                                                                                                | `gridaware-symbol-ink.svg`                                                                |
| Small-size cut (≤32px)    | 72px rail (28px slot), 16px favicons             | `gridaware-symbol-small-dark.svg`                                                                                          | `gridaware-symbol-small.svg`                                                              |
| Contained app tile        | iOS/Android/PWA, social avatar                   | `gridaware-symbol-tile-dark.svg` (`#080808` tile, `rx=56`)                                                                 | `gridaware-symbol-tile-yellow.svg` (`#F4E952` tile, `#080808` symbol)                     |
| Thinned reversed white    | 1-color white emboss, screenprint, dark overlays | `gridaware-horizontal-reversed-white.svg` · `gridaware-symbol-reversed-white.svg` · `gridaware-stacked-reversed-white.svg` | —                                                                                         |
| Wordmark only             | Co-branded footers, symbol already adjacent      | `gridaware-wordmark-white.svg`                                                                                             | `gridaware-wordmark-ink.svg`                                                              |

Horizontal SVG viewBox: `0 0 1027 256` (badge-light `0 0 1031 256`); stacked `0 0 812 436`; symbol `0 0 256 256`.

### 2.3 Quick picker

| Context                                 | File                                                             |
| --------------------------------------- | ---------------------------------------------------------------- |
| Expanded sidebar (248px) / dark headers | `source/gridaware-horizontal-dark.svg` at **28px** symbol height |
| Collapsed rail (72px)                   | `source/gridaware-symbol-small-dark.svg` at **28×28px**          |
| Light web header / light PDF cover      | `source/gridaware-horizontal-badge-light.svg`                    |
| Light print / mono docs / invoices      | `source/gridaware-horizontal-ink.svg`                            |
| White emboss / dark screenprint         | `source/gridaware-horizontal-reversed-white.svg`                 |
| Splash / signage / badge                | `source/gridaware-stacked-dark.svg` (or `-ink`)                  |
| Social avatar / app store               | `source/gridaware-symbol-tile-dark.svg`                          |
| Merch / sticker accent                  | `source/gridaware-symbol-tile-yellow.svg`                        |
| Favicon & PWA                           | `digital/web-icons/*` → copy into `client/public/`               |
| Auth/onboarding backdrops, slide covers | `system/gridaware-pattern-dark.svg`                              |

### 2.4 Construction & optical calibration (`brand/system/gridaware-construction-grid.svg`)

- Integer **256×256** grid; footprint `x ∈ [24, 232]`, `y ∈ [23, 231]` (nudged −1u to optical center).
- Vertical stems **46u** (`x 24..70`, `186..232`); horizontals thinned ~9–13%: top **42u**, crossbar **40u**, bottom **42u**; counters upper **43u**, lower **41u**.
- Sensor node optically enlarged to **48×48u** (`x 184..232`, `y 23..71`).
- Corner radii: outer silhouette **R20u**, interior counters **R10u**, cut terminals **R8u**.
- **Small cut** (≤32px): edges snap to 16u multiples (`16, 64, 80, 112, 144, 160, 176, 192, 240`) = 1px at 16×16, no half-pixel blur.
- **Reversed-white cut:** strokes thinned ~4.3% (`46u→44u` stems, `42u→40u` bars) against halation.

### 2.5 Logotype — _Unbounded Custom_

- Built from **Unbounded** (NaN Foundry, SIL OFL 1.1), outlined to cubic Béziers; zero runtime font dependency.
- Wide architectural stance; sculptural ink-traps on `r, d, A, w, a, e`; squared horizontal-bar G spur.
- Tracking **−0.025em**; optical kerning `A–w`, `w–a`, `d–A`, `G–r`; custom **Node-squircle tittle on `i`** (asymmetric 40% top-right radius).
- Weights: masters `wght 580`; reversed-white masters `wght 545` (~6% lighter).
- **Never re-type the logo in a system or web font.**

### 2.6 Clear space & minimum sizes

- **Clear space = 1×N** on all sides, where **N = width of the detached sensor node** in that rendering. Nothing (text, borders, badges, logos) enters it.
  - Exception: inside the 64px app header, vertical padding may compress to **0.6×N (16–18px)** if horizontal separation from sidebar border and collapse toggle stays ≥1×N.

| Lockup              | Min screen                 | Min print | Note                               |
| ------------------- | -------------------------- | --------- | ---------------------------------- |
| Horizontal          | **112px wide** (28px tall) | 28mm      | Below 112px use the symbol         |
| Stacked             | 96px wide                  | 24mm      | Never in narrow horizontal navbars |
| Symbol standard cut | 32×32px                    | 8×8mm     | Use above 32px                     |
| Symbol small cut    | 16×16px                    | 5×5mm     | Mandatory for 16–32px              |
| Wordmark only       | 88px wide                  | 22mm      | Never add tracking                 |

### 2.7 Approved logo / background pairings

1. **Default — on `#080808`, `#101010`, `#171717`:** `*-dark.svg` (white frame/type + yellow node).
2. **On `#FFFFFF` / `#E9ECF2`:** full-color `horizontal-badge-light.svg` (dark badge tile holding the symbol, `#080808` wordmark) or flat `*-ink.svg` (solid `#080808`).
3. **On Soft Yellow `#F4E952`:** solid `#080808` (`symbol-tile-yellow.svg`, `horizontal-ink.svg`).
4. **On photos / complex backgrounds:** `symbol-tile-dark.svg` or `horizontal-reversed-white.svg` over a calm area with ≥4.5:1 verified contrast.
5. Logo yellow is a **brand identifier**, never an operational status.

### 2.8 Shell integration (`brand/system/gridaware-shell-preview.svg`)

- **Expanded (248px × 64px header):** `gridaware-horizontal-dark.svg`, **28px symbol height** (~161px lockup width), left padding **20px** (67px right margin), vertically centered.
- **Collapsed (72px × 64px header):** `gridaware-symbol-small-dark.svg` **28×28px**, centered at `x=36, y=32`, `aria-label="GridAware Dashboard"`.
- **RTL:** sidebar moves right; **never mirror** the symbol or logotype.

### 2.9 Logo motion

- **Reveal (splash / video sting, ≤1.2s):** G frame settles `0–500ms` with `cubic-bezier(0.22, 1, 0.36, 1)`; sensor node steps **4px** into grid lock and illuminates `#F4E952` at `400–850ms`; resolve to static master.
- **In-app:** never pulse, spin, or glow the sidebar logo. With `prefers-reduced-motion: reduce`, render the static master immediately.

### 2.10 Logo don'ts

1. Don't recolor the node red/green to show app status (use `StatusBadge` / `FreshnessIndicator`).
2. Don't place uncontained yellow/lime on white/light gray.
3. Don't reattach, move, rotate, or delete the node.
4. Don't stretch, skew, outline, drop-shadow, or neon-glow.
5. Don't re-set "GridAware" in another typeface or change symbol-to-wordmark scale/gap.
6. Don't mirror in RTL.

### 2.11 Derived pattern (`brand/system/gridaware-pattern-dark.svg` / `-light.svg`)

- Built from the 3×3 grid and `R=8–14` corners: calm `#101010` / `#141414` cells and L-conduits on `#080808`; **≤2 active `#F4E952`/`#F6FA45` nodes per viewport**.
- **Use:** auth/onboarding split-screen backdrops (SC-01, SC-02), slide covers, social banners, business-card backs.
- **Never:** behind telemetry charts, alert queues, dense tables (operational clarity over decoration). Never behind auth form fields if it reduces readability.

### 2.12 Web head / PWA

```html
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#080808" />
```

`site.webmanifest`: `name: "GridAware"`, icons `icon-192.png` (192), `icon-512.png` (512), `maskable-512.png` (512, `purpose: maskable`), `theme_color` and `background_color` `#080808`, `display: standalone`.

In Next.js App Router, prefer the `metadata` export (`icons`, `manifest`, `themeColor` via `viewport`) over raw tags. Replace the default `"Create Next App"` title with `GridAware`.

### 2.13 Brand reproduction (print approximations — verify drawdowns)

| Swatch        | Token               | HEX       | RGB         | CMYK        | Pantone              | On `#080808` |
| ------------- | ------------------- | --------- | ----------- | ----------- | -------------------- | -----------: |
| Soft Yellow   | `--color-yellow`    | `#F4E952` | 244,233,82  | 4,0,76,0    | PMS 3945 C           |      15.85:1 |
| Neon Lime     | `--color-lime`      | `#F6FA45` | 246,250,69  | 6,0,83,0    | PMS 388 C            |      17.81:1 |
| Golden Yellow | `--color-gold`      | `#FCCE35` | 252,206,53  | 0,18,86,0   | PMS 115 C            |      13.37:1 |
| Near Black    | `--color-black`     | `#080808` | 8,8,8       | 72,66,65,92 | PMS Black 6 C        |            — |
| Cool White    | `--color-off-white` | `#E9ECF2` | 233,236,242 | 6,3,1,0     | PMS Cool Gray 1 C    |      16.92:1 |
| Pure White    | `--color-white`     | `#FFFFFF` | 255,255,255 | 0,0,0,0     | Paper / Opaque White |      20.03:1 |

Pre-launch: trademark + reverse-image clearance (Class 9 / Class 42), Pantone/CMYK physical proofs.

---

## 3. Color system

### 3.1 EVARAX brand palette (immutable, owner: product owner)

| Token               | Name          | HEX       | Role                                                                                                       |
| ------------------- | ------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| `--color-yellow`    | Soft Yellow   | `#F4E952` | Primary brand accent, primary CTA fill, logo node, primary highlighted chart series                        |
| `--color-lime`      | Neon Lime     | `#F6FA45` | Secondary accent; focus ring / active indicator; sparse pattern highlight; secondary/selected chart series |
| `--color-gold`      | Golden Yellow | `#FCCE35` | Tertiary warm accent; selected-data emphasis; `SIMULATED` context badge accent; comparison series          |
| `--color-black`     | Near Black    | `#080808` | Primary canvas, icon tile, text on yellow fills, light-mode ink                                            |
| `--color-off-white` | Cool White    | `#E9ECF2` | Primary body/data text on dark                                                                             |
| `--color-white`     | Pure White    | `#FFFFFF` | Strongest headings/emphasis, logo frame & wordmark on dark                                                 |

Yellow ≠ warning. Lime ≠ healthy. Gold ≠ critical.

### 3.2 Derived neutral tokens (proposed; owner: design system; _not_ EVARAX colors)

| Token              | Value     | Use                                              |
| ------------------ | --------- | ------------------------------------------------ |
| `--surface-canvas` | `#080808` | App canvas                                       |
| `--surface-1`      | `#101010` | Sidebar, base containers                         |
| `--surface-2`      | `#171717` | Cards, inputs, menus, dropdowns                  |
| `--surface-3`      | `#202020` | Hover / elevated neutral                         |
| `--surface-4`      | `#292929` | Selected neutral surface                         |
| `--border-subtle`  | `#2A2A2A` | Dividers, low-emphasis outlines                  |
| `--border-default` | `#363636` | Standard card/input border                       |
| `--border-strong`  | `#555555` | Strong boundaries, selected controls             |
| `--text-primary`   | `#E9ECF2` | Main text                                        |
| `--text-strong`    | `#FFFFFF` | High emphasis                                    |
| `--text-secondary` | `#B8BDC7` | Secondary content                                |
| `--text-muted`     | `#9298A3` | Metadata (contrast-check at size)                |
| `--text-disabled`  | `#707680` | Disabled labels only; never essential info alone |

Pattern-only surfaces: `#141414` (brand pattern cells).

### 3.3 Semantic operational status (proposed; owner: product + UX + engineering)

| Role                  | Token               | Value     | Meaning                      | Required non-color cue         |
| --------------------- | ------------------- | --------- | ---------------------------- | ------------------------------ |
| Success / healthy     | `--status-success`  | `#35C58A` | Confirmed healthy/successful | Label + check icon             |
| Warning               | `--status-warning`  | `#F0B84B` | Attention required           | Label + warning triangle       |
| Critical              | `--status-critical` | `#F06A6A` | Critical / urgent            | Label + alert icon (octagon/!) |
| Informational         | `--status-info`     | `#65A9E8` | Informational/neutral event  | Label + info icon              |
| Offline / unavailable | `--status-offline`  | `#9AA1AC` | No connection / unavailable  | Label + disconnected icon      |
| Unknown               | `--status-unknown`  | `#B3A4D8` | Cannot be determined         | Label + question icon          |

Additional state cues: **Stale** → clock icon + last-seen timestamp (use warning or offline tint per policy, never success). **Simulated** → simulation badge with gold accent + text.

Derived subtle variants (for badge backgrounds, e.g. `bg-status-warning-subtle`) must be defined as separate tokens and contrast-checked; a reasonable starting point is the status color at ~12–16% alpha over `surface-2` with the full-strength color for text/icon. Test on `surface-1` and `surface-2`.

**Status ≠ brand.** Do not use one status token for unrelated concepts. Keep separate vocabularies for: asset operational state, device connection, telemetry freshness/quality, alert lifecycle, incident lifecycle, work-order lifecycle, simulator state. Examples: `Operational`, `Device Offline`, `Data Stale`, `Alert Acknowledged`, `Incident Investigating`, `Work Order In Progress`, `Simulator Paused`.

### 3.4 Contrast reference

| Foreground    | Background  |   Ratio | Verdict       |
| ------------- | ----------- | ------: | ------------- |
| Soft Yellow   | Near Black  | 15.85:1 | ✅            |
| Neon Lime     | Near Black  | 17.81:1 | ✅            |
| Golden Yellow | Near Black  | 13.37:1 | ✅            |
| Cool White    | Near Black  | 16.92:1 | ✅            |
| Pure White    | Near Black  | 20.03:1 | ✅            |
| Near Black    | Cool White  | 16.92:1 | ✅            |
| Near Black    | Soft Yellow | 15.85:1 | ✅ (CTA text) |
| Soft Yellow   | Pure White  |  1.26:1 | ❌ never      |
| Neon Lime     | Pure White  |  1.12:1 | ❌ never      |
| Golden Yellow | Pure White  |  1.50:1 | ❌ never      |

WCAG thresholds: normal text ≥4.5:1, large text ≥3:1, UI component boundaries & meaningful graphics ≥3:1, focus indicators clearly visible. Check every state (hover, focus, disabled, selected, chart labels, tooltips, badges, overlays).

### 3.5 Usage map

| UI element              | Treatment                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| App background          | `surface-canvas`                                                                                                                                                         |
| Sidebar                 | `surface-1` (or canvas) separated by `border-subtle`, never a bright panel                                                                                               |
| Body text / data values | `text-primary`                                                                                                                                                           |
| Strong headings         | `text-strong` or `text-primary`; hierarchy is typographic                                                                                                                |
| Primary CTA             | `#F4E952` fill, `#080808` text                                                                                                                                           |
| Secondary CTA           | transparent/dark surface, `border-default` (neutral) border, Cool White text (brand-color-foundation also allows yellow border/text — prefer neutral to avoid competing) |
| Ghost/tertiary          | no heavy fill, clear hover/focus                                                                                                                                         |
| Destructive             | `status-critical` treatment, **never** brand yellow                                                                                                                      |
| Selected nav item       | `surface-3`/`surface-4` + Soft Yellow (or Lime) indicator bar + `font-weight 600` (non-color cue)                                                                        |
| Focus ring              | Neon Lime outline, 2px, with offset (see §6.4)                                                                                                                           |
| Selected row            | subtle surface + yellow accent indicator                                                                                                                                 |
| Dividers                | `border-subtle`                                                                                                                                                          |
| Chart grid              | muted neutral grays; axes/labels Cool White/secondary                                                                                                                    |

| Product area          | Palette guidance                                                                |
| --------------------- | ------------------------------------------------------------------------------- |
| Dashboard             | Canvas, Cool White data, Yellow for primary emphasis, restrained Lime           |
| Infrastructure tables | Neutral surfaces, Cool White text, Yellow for selected row/action               |
| Live Monitoring       | Neutral chart base, one accent series at a time, explicit threshold annotations |
| Alerts                | Semantic severity only; brand accents for selection/focus only                  |
| Incidents             | Semantic status in labels/timeline; yellow remains brand                        |
| Work Orders           | Neutral surfaces, strong typography, Yellow for primary action                  |
| Analytics             | Consistent chart palette + non-color distinctions + accessible legends          |
| Administration        | Most restrained accent usage                                                    |

### 3.6 Effects

- No persistent neon glow on text/borders. No gradients/high-saturation fills by default. Restrained glow only if reviewed.
- Theme: **dark-only for MVP** unless a light theme is explicitly designed (do not imply both). Light contexts exist only for brand collateral (PDF reports, print).

---

## 4. Typography

### 4.1 Families

| Role                       | Family                    | Weights                            | Stack                                                                                                              |
| -------------------------- | ------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Product UI, body, headings | **Geist Sans**            | 400, 500, 600, 700 (700 sparingly) | `'Geist Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`                                          |
| Technical & numeric        | **Geist Mono**            | 400, 500, 600                      | `'Geist Mono', ui-monospace, 'SFMono-Regular', Consolas, monospace` (fallbacks: JetBrains Mono / Ubuntu Sans Mono) |
| Arabic (future)            | **IBM Plex Sans Arabic**  | 400–700                            | Applied under `[lang="ar"]`                                                                                        |
| Logo                       | Custom outlined Unbounded | —                                  | **SVG only**                                                                                                       |

All SIL OFL 1.1. Do not add a fourth Latin family. No ultra-condensed, sci-fi, overly rounded, light (300) weights on dark, or excessive italics.

**Mono is used for:** telemetry values with units (`86.5 °C`, `4.2 mm/s`), KPI numerals, asset/incident/work-order/alert IDs (`GEN-01`, `INC-0045`, `WO-1042`, `ALT-000123`), UTC timestamps in technical contexts, MQTT topic paths, API paths, model versions, device codes, hex values, code. **Never** for paragraphs, long labels, or human-readable asset names (unless the name is a technical code).

### 4.2 Core type scale

| Token                   | Size / line-height | Weight | Tracking           | Use                                 |
| ----------------------- | ------------------ | ------ | ------------------ | ----------------------------------- |
| `display-xl`            | 48 / 56            | 600    | −0.03em            | Marketing hero only                 |
| `display-lg`            | 40 / 48            | 600    | −0.03em            | Landing headline                    |
| `display` (app)         | 32 / 40            | 600    | −0.02em            | Rare product headline               |
| `page-title` (h1)       | 28 / 36            | 600    | −0.02em            | Main page title                     |
| `section-title` (h2)    | 22 / 30            | 600    | −0.015em           | Major section                       |
| `subsection-title` (h3) | 18 / 26            | 600    | 0                  | Card group / subsection             |
| `card-title` (h4)       | 16 / 24            | 600    | 0                  | Card/panel title                    |
| `body-lg`               | 16 / 24            | 400    | 0                  | Intro / important explanation       |
| `body`                  | 14 / 21            | 400    | 0                  | Default UI text                     |
| `body-sm`               | 13 / 19            | 400    | 0                  | Dense tables, secondary copy        |
| `label`                 | 13 / 18            | 500    | 0                  | Form labels, nav labels             |
| `caption`               | 12 / 16            | 400    | 0                  | Metadata, timestamps (non-critical) |
| `overline`              | 11 / 14            | 600    | +0.06em, UPPERCASE | Short group labels only             |

### 4.3 Operational data scale

| Token          | Size / LH | Weight | Family | Use                                |
| -------------- | --------- | ------ | ------ | ---------------------------------- |
| `metric-xl`    | 36 / 44   | 600    | Mono   | Primary KPI                        |
| `metric-lg`    | 28 / 36   | 600    | Mono   | Asset detail measurement           |
| `metric-md`    | 22 / 28   | 600    | Mono   | Compact metric card                |
| `metric-sm`    | 16 / 22   | 600    | Mono   | Inline measurement                 |
| `metric-unit`  | 12 / 16   | 500    | Sans   | Unit beside value (lower emphasis) |
| `chart-axis`   | 11 / 14   | 400    | Sans   | Axis labels                        |
| `chart-legend` | 12 / 16   | 500    | Sans   | Legend                             |
| `table-data`   | 13 / 18   | 400    | Sans   | Dense tables                       |
| `technical-id` | 12 / 18   | 400    | Mono   | IDs                                |

Numeric readouts tracking 0 to −0.01em. IDs preserve source casing.

### 4.4 Component type styles

**Shell:** nav item Sans 500 13/20; active nav Sans 600 13/20; breadcrumbs 400 12/16; org/site switcher 500 13–14/20; user menu 500 13/20.
**Dashboard:** page heading 600 28/36; card title 600 16/24; KPI value Mono 600 28/36 or 36/44; KPI label 500 12/16; comparison text 400 12/16; chart title 600 14/20.
**Asset detail:** asset name 600 28/36; type/location 400 13/19; measurement Mono 600 28/36; unit 500 12/16; sensor label 500 13/18; last-updated 400 12/16.
**Charts:** title 600 14/20; axis 400 11/14; legend 500 12/16; tooltip label 500 12/16; tooltip reading Mono 500 13/18; threshold annotation 500 11/14. Reduce tick density before shrinking labels.
**Tables:** header 600 11–12/16 (sentence case); cell 400 13/18; secondary cell 400 12/16; numeric Mono 400 (or Sans tabular) 12–13/18, **right-aligned** (LTR), text left-aligned; row action 500 12–13/18. Units in header or adjacent.
**Forms:** label 500 13/18; input value 400 14/20 (**16px on mobile** to prevent auto-zoom); placeholder 400 14/20 (lower emphasis, still readable); helper 400 12/16; error 500 12/16; form section heading 600 16/24.
**Buttons/controls:** primary/secondary button 600 14/20; compact 600 13/18; tabs 500 13/18 (selected 600); select option 400 14/20.
**Alerts/status:** alert title 600 14/20; description 400 13/19; status badge 600 11–12/16; incident ID Mono 400 12/18; timestamp 400 12/16.
**Notifications:** title 600 13/19; summary 400 13/19; timestamp 400 11–12/16; related ID Mono 400 11–12/16.

### 4.5 Rules

- Sentence case for headings, nav, buttons, labels, page titles. Never whole sentences in uppercase; never `text-transform: uppercase` on user content or asset names.
- Body line-height 1.4–1.5; headings 1.15–1.3. Line length 45–80 chars for prose (max 720–800px reading width).
- Don't truncate critical incident descriptions, alarm reasons, asset names, or safety instructions without a reveal (tooltip/detail, keyboard accessible).
- Body copy never below **14px** in app content; caption (12px) only for metadata, not instructions.
- Weight is never the only status signal. Avoid 700 on every heading.
- Support 200% zoom with no clipping. No text baked into images.

### 4.6 Numeric & measurement typography

```css
.numeric,
.telemetry-value,
.kpi-value,
.table-numeric {
  font-family: var(--font-mono);
  font-variant-numeric: lining-nums tabular-nums;
  font-feature-settings:
    "lnum" 1,
    "tnum" 1;
}
```

- Always show the unit; keep it visually attached but lower emphasis (`86.5 °C`, `4.20 mm/s`, `400 V`, `49.98 Hz`).
- Consistent decimal precision **per metric**; never jitter between 1/2/4 decimals.
- Preserve meaningful `+`/`−` signs. Locale-aware separators and dates.
- Never silently convert units. Never animate digits excessively.
- A stale reading must not have the same treatment as a fresh one — pair with a freshness label (and reduce emphasis, e.g. `text-secondary`).
- Provide copy actions for long IDs.

### 4.7 Responsive type

| Token              | Desktop | Tablet | Mobile |
| ------------------ | ------: | -----: | -----: |
| `display-xl`       |   48/56 |  40/48 |  32/40 |
| `display-lg`       |   40/48 |  36/44 |  30/38 |
| `page-title`       |   28/36 |  26/34 |  24/32 |
| `section-title`    |   22/30 |  20/28 |  18/26 |
| `subsection-title` |   18/26 |  18/24 |  16/24 |
| `body-lg`          |   16/24 |  16/24 |  16/24 |
| `body`             |   14/21 |  14/21 |  14/21 |
| `caption`          |   12/16 |  12/16 |  12/16 |

Reflow layout before compressing type. Headings wrap naturally. Test at 320, 375, 768, 1024, 1280, 1440.

---

## 5. Spacing, layout & grid

### 5.1 Spacing scale (4px base, 8px rhythm)

| Token      |  px | Typical use                                 |
| ---------- | --: | ------------------------------------------- |
| `space-0`  |   0 | Explicit reset                              |
| `space-1`  |   4 | Icon micro gap, compact inline              |
| `space-2`  |   8 | Icon-to-label, label-to-input, related rows |
| `space-3`  |  12 | Compact internals, table cell padding       |
| `space-4`  |  16 | Default component gap, compact card padding |
| `space-5`  |  20 | Intermediate grouping                       |
| `space-6`  |  24 | Standard card padding, grid gap             |
| `space-8`  |  32 | Section spacing, desktop page padding       |
| `space-10` |  40 | Large section separation                    |
| `space-12` |  48 | Major page grouping                         |
| `space-14` |  56 | Rare                                        |
| `space-16` |  64 | Major/shell spacing                         |
| `space-20` |  80 | Page-level, rare                            |
| `space-24` |  96 | Marketing / empty state only                |
| `space-30` | 120 | Hero only — never routine product screens   |

Prefer `space-1…8` inside components; `space-6…12` between sections. **No one-off values** (13px, 27px). Zero spacing is explicit.

### 5.2 Spacing recipes

| Relationship                              |                                          Spacing |
| ----------------------------------------- | -----------------------------------------------: |
| Icon ↔ label                              |                                                8 |
| Label ↔ input                             |                                                8 |
| Input ↔ helper/error                      |                                              4–8 |
| Field ↔ next field                        |                                            16–20 |
| Field group ↔ field group / form sections |                                    16–20 / 24–32 |
| Card title ↔ content                      |                                               16 |
| Card padding                              |                   20–24 (default 24, compact 16) |
| Cards in a grid                           |                                            16–24 |
| Breadcrumb ↔ title                        |                                             8–12 |
| Title ↔ description                       |                                                8 |
| Page header ↔ body                        |                                            24–32 |
| Primary ↔ secondary action                |                                             8–12 |
| Major page sections                       |                                            32–48 |
| Dashboard row gap                         |  20–24 (24 within rows, 32 between major groups) |
| Table cell padding                        | 12–16 horizontal, 12 vertical (density-adjusted) |
| Dialog title ↔ body / body ↔ footer       |                                          16 / 24 |

### 5.3 Shell & canvas geometry

| Element                  | Value                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar expanded         | **248px**                                                                                                                       |
| Sidebar collapsed (rail) | **72px**                                                                                                                        |
| Top bar                  | **64px**                                                                                                                        |
| Page padding             | desktop **32px**, compact desktop **24px**, tablet **24px** (design-system says 20px — 24px used by grid spec), mobile **16px** |
| Page top padding         | 32px (24px constrained); bottom 48px                                                                                            |
| Content max width        | **1600px** (after sidebar)                                                                                                      |
| Utility drawer           | 400px default, 360px min                                                                                                        |

```css
.page-canvas {
  width: 100%;
  max-width: 1600px;
  margin-inline: auto;
  padding-inline: 32px;
  padding-block: 32px 48px;
}
```

Sidebar width must never change per page. Monitoring may use full width up to 1600; forms/settings use narrower columns.

### 5.4 Responsive grid

| Band      | Columns | Gutter |  Outer padding |
| --------- | ------: | -----: | -------------: |
| 320–374   |       4 |     12 |             16 |
| 375–767   |       4 |     16 |             16 |
| 768–1023  |       8 |     20 |             24 |
| 1024–1439 |      12 |     24 |          24–32 |
| 1440+     |      12 |     24 | 32 + max-width |

Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536` (Tailwind defaults match).

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

Always `minmax(0, 1fr)` and `min-width: 0` on grid children with charts/tables/long text.

### 5.5 Dashboard patterns (desktop, 12-col)

| Pattern                     | Spans   | Use                                                                                       |
| --------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| Four KPI cards              | 3/3/3/3 | Total assets, needing attention, active alerts, open incidents (5 allowed at wide widths) |
| Main chart + side panel     | 8 + 4   | Trend + context                                                                           |
| Two equal charts            | 6 + 6   | Comparison                                                                                |
| Full-width table / timeline | 12      | Lists, history                                                                            |
| Three panels                | 4/4/4   | Compact summaries                                                                         |

### 5.6 Content width rules

| Content              |       Max width |
| -------------------- | --------------: |
| Auth form            |         420–480 |
| Standard form column |         560–640 |
| Settings             |        880–1040 |
| Reading text         |         720–800 |
| Detail page          |       1200–1600 |
| Monitoring           | full up to 1600 |

### 5.7 Component sizing

**Buttons**

| Size        | Height | H‑padding | Use                           |
| ----------- | -----: | --------: | ----------------------------- |
| Compact     |     32 |        12 | Dense table actions, toolbars |
| Default     |     40 |        16 | Standard                      |
| Comfortable |     44 |     16–20 | Touch / primary workflow      |
| Large       |     48 |     20–24 | Onboarding, key forms         |

Icon-only buttons: ≥40px hit area (44 on touch) with 16–20px glyph. One consistent height per context.

**Form controls:** text input / select / date range **40px**; search 40px (44 on prominent mobile); textarea min 96px, grows; checkbox/radio visual 16–18px with larger hit area; switch 20–24px visual height.

**Cards:** standard 20–24; compact metric 16; dense data panel 12–16; feature/onboarding 24–32; chart card 20–24 (header / plot / footer distinct). Don't nest decorative cards.

**Tables**

| Density               | Row height | Vertical cell padding |
| --------------------- | ---------: | --------------------: |
| Comfortable (default) |      52–56 |                 14–16 |
| Compact               |      44–48 |                 10–12 |
| Touch-friendly        |      56–64 |                 16–20 |

**Overlays**

| Surface             |   Width |
| ------------------- | ------: |
| Confirmation dialog | 400–480 |
| Standard dialog     | 560–640 |
| Large dialog        | 720–800 |
| Side drawer         | 360–420 |
| Wide detail drawer  | 480–560 |
| Popover             | 240–360 |

Mobile: dialogs/drawers become near-full-screen sheets within the viewport.

**Icons:** inline 16; button/nav 18–20; empty-state/feature 24–32; icon↔label 8; icon↔icon min 8.

**Charts:** compact plot 180–240px; standard time-series 240–320px; investigation 320–420px. Legends outside plot when they'd obscure data.

### 5.8 Density modes

- **Comfortable (default):** card padding 20–24, rows 52–56, inputs 40, clear section separation. Dashboards, forms, details, new users.
- **Compact (specialized):** panel padding 12–16, rows 44–48, tighter toolbars. Asset lists, event logs, monitoring workspaces.
- Never shrink text below the scale or hide status/freshness in compact. No third ultra-compact mode in MVP. User toggle is an open decision.

### 5.9 Page templates

- **Dashboard:** header (title, context, date range/primary action) → KPI strip → primary analysis row (8+4) → secondary analysis → operational lists.
- **List/table:** header + primary action → search/filter/sort/view toolbar (one row or filter drawer) → result count + active filter chips → table/cards → pagination.
- **Detail:** breadcrumb → identity header (name + status) → primary actions → key facts/metric strip → main sections → history/audit/related/timeline. Don't repeat the same status badge in every section.
- **Form/setup:** 560–640px column; labeled groups; persistent action area that never covers the last field/focus; explain irreversible actions first.
- **Live monitoring:** full width; identity + connection + freshness near top; consistent chart-card header height and plot alignment; grouped time-range + metric controls; **no layout shift** on new data.
- **Simulator console:** scenario selection → parameters → start/pause/stop → state + elapsed time → telemetry preview → event log & fault history.

### 5.10 Layout exceptions

Allowed for: full-bleed monitoring canvas, high-density telemetry table, full-screen simulator/investigation, mobile technician action panel, marketing/auth compositions. Each must document user task, why standard fails, viewport range, a11y/scroll implications, test plan.

---

## 6. Shape, borders, elevation, z-index

### 6.1 Radius

| Token         |  Value | Use                            |
| ------------- | -----: | ------------------------------ |
| `radius-sm`   |    6px | Small controls, badges         |
| `radius-md`   |   10px | Inputs, buttons, compact cards |
| `radius-lg`   |   14px | Cards, panels                  |
| `radius-xl`   |   18px | Large overlays, feature panels |
| `radius-full` | 9999px | Pills, avatars, status dots    |

Restrained shape language — don't pill every control. (Brand marks: R20/R10/R8; pattern R8–14; app tile rx 56 on 256.)

### 6.2 Borders

- Subtle borders separate dark surfaces; stronger border for focus/selected/editable.
- Don't outline every nested container — group with spacing first.

### 6.3 Shadows

Only for overlays, popovers, dialogs, floating menus. Rely on surface contrast + borders; no large blurred shadows or neon glow. Suggested `shadow-overlay: 0 8px 24px rgba(0,0,0,0.5)` + `border-default` (review in Figma).

### 6.4 Focus ring

- `outline: 2px solid var(--color-lime); outline-offset: 2px;` on `:focus-visible`. Visible on base surface and on yellow fills (use a `#080808` inner ring / offset gap on yellow buttons so the lime ring separates from the yellow fill).
- Never hidden behind sticky headers, drawers, or overlays (`scroll-margin-top` ≥ top bar height).

### 6.5 Z-index (define once as tokens)

Suggested order: `base 0` < `sticky 10` (table headers, page header) < `sidebar 20` < `topbar 30` < `drawer 40` < `modal-backdrop 50` < `modal 60` < `popover/tooltip 70` < `toast 80`. Modal above drawers; toasts never cover modal actions or critical mobile controls.

---

## 7. Motion

- Short, purposeful transitions for menus, drawers, tabs, selection, state changes. Suggested tokens: `motion-fast 120ms`, `motion-base 200ms`, `motion-slow 300ms`; easing `cubic-bezier(0.22, 1, 0.36, 1)` (brand ease-out) for enter, `ease-in` for exit.
- No continuous glow/pulse on ordinary active states. **Never flash critical alerts.**
- Live readings: subtle background/opacity cue only; no layout jumps; no digit-roll animations.
- No auto-scrolling dashboards. No decorative loaders — use skeletons or restrained indicators.
- Motion is never the only signal; always provide text feedback.
- `@media (prefers-reduced-motion: reduce)` → disable non-essential transitions (render final state).

---

## 8. Iconography & imagery

- **One** icon library with consistent stroke weight (recommend Lucide — stroke, 1.5–2px, matches Geist; confirm license). Sizes per §5.7.
- Icons supplement labels; no unlabeled unfamiliar icons for critical actions. Icon-only controls need `aria-label` + tooltip.
- Decorative icons `aria-hidden="true"`; informative icons have text alternatives.
- Mirror only directional icons in RTL (arrows, back/forward), never logos or non-directional symbols.
- No decorative industrial stock imagery on operational pages. Illustrations only sparingly in empty states and never competing with the next action; on narrow screens, empty states must not be dominated by illustration.
- Brand pattern only on auth/onboarding/marketing (§2.11).

---

## 9. Design tokens — implementation source

One canonical token source in `client/app/globals.css` consumed through Tailwind v4 `@theme`. Components use semantic utilities only (`bg-canvas`, `bg-surface-2`, `text-primary`, `text-muted`, `border-subtle`, `bg-brand-primary`, `ring-brand-secondary`, `text-status-success`, `bg-status-warning-subtle`, `border-status-critical`).

```css
@import "tailwindcss";

:root {
  /* EVARAX brand palette — exact, immutable */
  --color-yellow: #f4e952;
  --color-lime: #f6fa45;
  --color-gold: #fcce35;
  --color-black: #080808;
  --color-off-white: #e9ecf2;
  --color-white: #ffffff;

  /* Neutral dark surfaces — derived, proposed */
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
  --text-on-brand: #080808;

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

  /* Focus */
  --focus-ring: var(--color-lime);

  /* Layout */
  --layout-sidebar-width: 248px;
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

@theme inline {
  /* Colors → bg-*, text-*, border-*, ring-* utilities */
  --color-canvas: var(--surface-canvas);
  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-surface-4: var(--surface-4);
  --color-border-subtle: var(--border-subtle);
  --color-border-default: var(--border-default);
  --color-border-strong: var(--border-strong);
  --color-primary: var(--text-primary);
  --color-strong: var(--text-strong);
  --color-secondary: var(--text-secondary);
  --color-muted: var(--text-muted);
  --color-disabled: var(--text-disabled);
  --color-on-brand: var(--text-on-brand);
  --color-brand-primary: var(--brand-primary);
  --color-brand-secondary: var(--brand-secondary);
  --color-brand-tertiary: var(--brand-tertiary);
  --color-status-success: var(--status-success);
  --color-status-warning: var(--status-warning);
  --color-status-critical: var(--status-critical);
  --color-status-info: var(--status-info);
  --color-status-offline: var(--status-offline);
  --color-status-unknown: var(--status-unknown);

  /* Fonts (variables come from next/font in layout.tsx) */
  --font-sans:
    var(--font-geist-sans), "Inter", system-ui, -apple-system, "Segoe UI",
    sans-serif;
  --font-mono:
    var(--font-geist-mono), ui-monospace, "SFMono-Regular", Consolas, monospace;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;

  /* Type scale (size / line-height) */
  --text-display: 2rem;
  --text-display--line-height: 2.5rem;
  --text-page-title: 1.75rem;
  --text-page-title--line-height: 2.25rem;
  --text-section-title: 1.375rem;
  --text-section-title--line-height: 1.875rem;
  --text-subsection-title: 1.125rem;
  --text-subsection-title--line-height: 1.625rem;
  --text-card-title: 1rem;
  --text-card-title--line-height: 1.5rem;
  --text-body-lg: 1rem;
  --text-body-lg--line-height: 1.5rem;
  --text-body: 0.875rem;
  --text-body--line-height: 1.3125rem;
  --text-body-sm: 0.8125rem;
  --text-body-sm--line-height: 1.1875rem;
  --text-label: 0.8125rem;
  --text-label--line-height: 1.125rem;
  --text-caption: 0.75rem;
  --text-caption--line-height: 1rem;
  --text-overline: 0.6875rem;
  --text-overline--line-height: 0.875rem;
  --text-metric-xl: 2.25rem;
  --text-metric-xl--line-height: 2.75rem;
  --text-metric-lg: 1.75rem;
  --text-metric-lg--line-height: 2.25rem;
  --text-metric-md: 1.375rem;
  --text-metric-md--line-height: 1.75rem;
  --text-metric-sm: 1rem;
  --text-metric-sm--line-height: 1.375rem;
}

html {
  color-scheme: dark;
}
body {
  background: var(--surface-canvas);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  line-height: 1.3125rem;
  font-feature-settings: "kern" 1;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
::selection {
  background: var(--color-yellow);
  color: var(--color-black);
}

[lang="ar"] {
  --font-sans: "IBM Plex Sans Arabic", sans-serif;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Tailwind's default spacing (`--spacing: 0.25rem`) already equals the 4px scale (`p-1`=4, `p-2`=8 … `p-30`=120). Avoid arbitrary values (`p-[13px]`).

Notes:

- Remove the scaffold `prefers-color-scheme` light/dark block and `font-family: Arial` from the current `globals.css`.
- Never hardcode the six EVARAX HEX values inside component styles — use tokens.
- Figma token groups mirror code: `color.brand.*`, `color.surface.*`, `color.text.*`, `color.border.*`, `color.status.*`, `color.focus.*`, `spacing.*`, `radius.*`, `typography.*`, `shadow.*`, `motion.*`, `breakpoint.*`.

**Token ownership:** EVARAX palette → product owner (no change without approval). Neutrals → design system owner. Status colors → product + UX + engineering. Typography/spacing → UX (documented revision). Chart palette → UX + data-viz owner. Component states → UX + frontend.

---

## 10. Application shell

### 10.1 Regions (authenticated desktop)

1. **Left sidebar** — logo + primary navigation.
2. **Top bar (64px)** — sidebar toggle, organization switcher, site context, global search (P1), notifications + unread count, help/docs, user avatar menu. Lower-priority items go into overflow at narrow widths.
3. **Page header** — breadcrumbs, page title (h1), optional description, primary action(s), page-level filters/date range. Same structure on list/detail/dashboard.
4. **Main content** — consistent gutters, predictable heading hierarchy, **local** loading/error/empty regions (never blank out the shell).

Optional secondary contextual panel on detail pages must not compete with main content.

### 10.2 Organization & site context

- Active organization is always visible. Single-membership users may get a compact switcher but context stays clear.
- Switch flow: open → search/select authorized org → warn on unsaved edits → confirm → **clear tenant caches** → validate membership → load → refresh permissions → reset invalid filters → safe default route if current route unavailable → contextual confirmation. Never render previous tenant data under the new header.
- Site selector is a **filter**, not a security boundary: "All sites" or one site, visible chip, clear reset. Never silently changes org. Auto-clear with non-blocking explanation if the selected site is deleted/inaccessible.

### 10.3 Global search (P1)

MVP scope: assets, sites, incidents, work orders (alerts optional). Permission-filtered server-side, grouped by type with entity label + site/asset context, distinct no-results vs error states, never leak unauthorized existence. Keyboard-navigable command palette (OV-09).

### 10.4 Banners (`ContextBanner`)

Reserved for: `SIMULATED DATA` (demo contexts), `STALE DATA` / degraded service, org/site context warnings, permission/session warnings. Define priority; never stack without rules. Dismissible only if dismissal doesn't hide required operational info (simulation banner is **not** dismissible).

### 10.5 User menu

Profile · Personal preferences · Notification preferences · Keyboard shortcuts/help · Sign out. Keep separate from organization administration. Session expiry explains why, preserves recoverability and unsaved work where feasible.

### 10.6 Responsive shell

Desktop: expanded/collapsed sidebar + full top bar. Tablet: collapsed rail or overlay drawer + compact top bar (org/site still visible). Mobile: drawer (or validated compact nav); breadcrumbs collapse to current page + back; context remains discoverable. Sticky elements never cover focus, forms, chart controls.

### 10.7 Shell accessibility

Landmarks (`header`, `nav`, `main`, `aside`), **skip-to-main-content** link, keyboard-navigable sidebar/menus, route-change announcement, predictable focus after navigation/drawer close, accessible names for icon-only controls, selected nav not color-only (`aria-current="page"` + indicator bar + weight).

---

## 11. Information architecture & navigation

### 11.1 Principles

Organize around user tasks (not backend modules) · asset is the persistent canonical context · separate detection (alert) from response (incident, work order) · progressive disclosure · context before action · explicit data freshness · role-aware, not role-fragmented.

### 11.2 Domains

| Domain         | User question                                     | MVP                                                                                                        |
| -------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Dashboard      | What needs my attention now?                      | P0                                                                                                         |
| Infrastructure | What equipment do we have, and where?             | P0                                                                                                         |
| Monitoring     | What is happening now and over time?              | P0                                                                                                         |
| Alerts         | What condition was detected; does it need review? | P0                                                                                                         |
| Incidents      | Which problems are being investigated?            | P0                                                                                                         |
| Work Orders    | What maintenance tasks need doing?                | P0                                                                                                         |
| Maintenance    | What was performed / planned?                     | P0 basic history; schedules later                                                                          |
| Analytics      | How are we performing over time?                  | Basic P0/P1; deeper later                                                                                  |
| Administration | Who has access; how is it configured?             | P0 minimum                                                                                                 |
| Intelligence   | (dedicated AI workspace)                          | **Deferred (P2)** — anomaly/prediction context lives inside Monitoring/Alert/Asset behind capability flags |

### 11.3 Object hierarchy

```text
Platform
└── Organization
    ├── Members
    └── Site
        ├── Building (optional)
        │   └── Area / Floor (optional)
        ├── Assets
        │   ├── Asset details
        │   ├── Sensors / Devices
        │   │   └── Telemetry
        │   ├── Alerts
        │   ├── Incidents
        │   └── Maintenance history
        └── Site activity
```

Assets may attach directly to a site (buildings optional). A sensor belongs to an asset; a device may publish for several sensors.

### 11.4 Sidebar (canonical order)

```text
[Node G logo]

Workspace
  Dashboard
Infrastructure
  Sites
  Buildings            (conditional)
  Assets
  Sensors & Devices
Monitoring
  Live Monitoring
  Telemetry Explorer
  Simulator            (environment/permission-dependent; always labeled)
Operations
  Alerts
  Incidents
  Work Orders
  Maintenance
Insights
  Analytics
Administration         (permission-dependent)
  Members
  Roles & Permissions  (Owner/admin)
  Organization Settings
  Audit Log            (Owner/admin)
```

Technicians additionally get **My Work** (`/app/my-work`) as their landing. Group headers use `overline` style. Parent group stays expanded when a child is active. Collapsed rail: icons + tooltips + accessible names.

### 11.5 Breadcrumb examples

```text
Infrastructure / Sites / North Factory
Infrastructure / Assets / Generator-01 / Sensors
Monitoring / Telemetry Explorer
Operations / Alerts / ALT-000123
Operations / Incidents / INC-000045
Operations / Work Orders / WO-000078
```

Reflect real hierarchy and resource names; current page not a link; never expose restricted parent metadata; never replace the page title.

### 11.6 Contextual links

Site → filtered asset list · Asset → sensors, telemetry, alerts, incidents, maintenance · Alert → asset + related incident · Incident → asset + work orders · Work order → asset + incident · Maintenance record → asset + source work order. Dashboard cards always drill into filtered destinations.

---

## 12. Routes / sitemap

All authenticated routes under `/app`. Org resolved from session, never trusted from client. Query params for shareable filters (`/app/monitoring/telemetry?assetId=asset_123&metric=temperature&range=24h`); no secrets/PII in query strings.

**Public/auth:** `/` (landing or redirect to `/app/dashboard`) · `/login` · `/register` · `/invite/accept` · `/verify-email` · `/forgot-password` · `/reset-password` · `/auth/callback` (later).

**Onboarding:** `/onboarding` (router) · `/onboarding/create-organization` · `/onboarding/organization-profile` · `/onboarding/create-site` · `/onboarding/invite-team` (skippable) · `/onboarding/complete`. Resumable.

**App:**

| Area                 | Routes                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard            | `/app` → default landing · `/app/dashboard`                                                                                                       |
| Sites                | `/app/infrastructure/sites` · `/new` · `/[siteId]` · `/[siteId]/edit`                                                                             |
| Buildings (P1/cond.) | `/app/infrastructure/buildings` · `/new` · `/[buildingId]`                                                                                        |
| Assets               | `/app/infrastructure/assets` · `/new` · `/[assetId]` · `/[assetId]/edit` · `/[assetId]/sensors` · `/[assetId]/history` · `/[assetId]/maintenance` |
| Sensors              | `/app/infrastructure/sensors` · `/new` · `/[sensorId]`                                                                                            |
| Monitoring           | `/app/monitoring/live` · `/app/monitoring/telemetry` · `/app/monitoring/telemetry/[sensorId]` (P1) · `/app/monitoring/simulator`                  |
| Alerts               | `/app/alerts` · `/app/alerts/[alertId]`                                                                                                           |
| Incidents            | `/app/incidents` · `/new` (P0/P1) · `/[incidentId]`                                                                                               |
| Work orders          | `/app/work-orders` · `/new` · `/[workOrderId]` · `/app/my-work`                                                                                   |
| Maintenance          | `/app/maintenance` · `/records` · `/records/[recordId]` (P1) · `/schedules` (P1/later) · `/schedules/new` · `/schedules/[scheduleId]` (later)     |
| Analytics            | `/app/analytics` · `/assets` · `/incidents` · `/maintenance` (P1)                                                                                 |
| Settings             | `/app/settings` · `/organization` · `/members` · `/members/[memberId]` (P1/drawer) · `/roles` · `/audit-log` · `/notifications` (P1)              |
| Profile              | `/app/profile` · `/app/profile/preferences` (P1) · `/app/notifications`                                                                           |

**Internal (separate shell, never in customer nav):** `/platform` · `/platform/organizations` · `/platform/organizations/[organizationId]` · `/platform/audit`.

**Default landings:** Owner, Facility Manager, Viewer → `/app/dashboard`; Engineer → `/app/dashboard` or `/app/alerts` (preference); Technician → `/app/my-work`.

**Route states:** unauthenticated `/app/**` → login with safe return URL; no org → onboarding; no access → safe not-found/forbidden (no existence leak); archived → unavailable + safe route back; no sites → Create Site empty state; no assets → Add Asset guidance; no telemetry → explain, never healthy; simulator stopped → status + last event time; stale → stale + last successful timestamp; backend down → recoverable error, stale data never looks current.

Never show a page containing only placeholder charts.

---

## 13. Roles & permissions

Roles: **Organization Owner (OWN)**, **Facility Manager (FM)**, **Maintenance Engineer (ENG)**, **Technician (TEC)**, **Viewer (VIEW)**; internal **Platform Admin (PLAT)** is not a tenant role.

| Destination       | OWN           | FM             | ENG                  | TEC                      | VIEW           |
| ----------------- | ------------- | -------------- | -------------------- | ------------------------ | -------------- |
| Dashboard         | Full          | Full           | Operational          | Technician-focused       | Read-only      |
| Sites             | Manage        | Manage         | View                 | Assigned context         | View           |
| Assets            | Manage        | Manage         | Manage/configure     | Assigned context         | View           |
| Sensors & Devices | Manage        | Manage         | Manage/configure     | Limited                  | View           |
| Monitoring        | View          | View           | View                 | Assigned context         | View           |
| Alerts            | Manage/review | Review         | Review               | Limited/assigned         | View or hidden |
| Incidents         | Manage        | Manage         | Manage               | Assigned, limited update | View           |
| Work Orders       | Manage        | Manage         | Create/assign        | Assigned/update          | View or hidden |
| Maintenance       | View/manage   | Manage         | Manage               | Record/update assigned   | View           |
| Analytics         | Org           | Site           | Operational          | Limited                  | Read-only      |
| Administration    | Manage        | Delegated only | No                   | No                       | No             |
| Simulator         | Start/stop    | Start/stop     | Start/stop (config.) | No                       | No             |

UI rules: hide actions whose existence would confuse; show disabled action + concise reason where context matters (read-only details). Viewer sees **no** enabled write controls. Technician UI hides admin/creation controls. Read-only records still show full status context. Permission-denied states never reveal cross-tenant resources.

---

## 14. Component catalog & specs

Every component documents: name/purpose, usage & non-usage, anatomy/slots, variants/properties, states (default, hover, focus-visible, pressed, selected, disabled, read-only, loading, error, empty, unavailable as applicable), responsive behavior, a11y, content guidance, related components, acceptance checklist. Use tokens only.

### 14.1 Inventory

**Shell:** `AppShell` (desktop/tablet/mobile) · `Sidebar` (expanded/collapsed/overlay, active item) · `SidebarGroup` · `TopBar` (default/compact) · `Breadcrumbs` (full/collapsed) · `OrganizationSwitcher` (closed/open/searching/no access) · `SiteSelector` (selected/empty/loading/unauthorized) · `GlobalSearch` (idle/typing/results/no results/error) · `UserMenu` · `NotificationBell` (empty/unread count/muted) · `PageHeader` · `ContextBanner` (info/warning/critical).

**Navigation & feedback:** `NavItem` · `Tabs` · `Pagination` · `Stepper` (current/completed/error) · `Toast` (success/info/warning/error) · `InlineAlert` · `ConfirmDialog` · `Drawer` · `Popover` · `Tooltip` (never sole source of critical info).

**Data display:** `MetricCard` (neutral/positive/warning/critical/unavailable) · `StatusBadge` (operational/warning/critical/offline/stale/unknown/simulated) · `SeverityBadge` (info/low/warning/high/critical) · `FreshnessIndicator` (live/delayed/stale/unavailable) · `DataQualityBadge` (valid/partial/invalid/estimated/unknown) · `AssetIdentity` (compact/full/with site) · `AssetHealthSummary` (known/unknown/insufficient data) · `SensorMetricRow` (normal/threshold warning/missing/stale) · `TrendIndicator` (up/down/stable/unknown; direction semantics configurable) · `ActivityTimeline` · `EmptyState` (first-use/filter-empty/unavailable) · `Skeleton` (card/row/chart/section) · `DataTable` (sortable/selectable/loading/empty/error) · `FilterBar` (compact/expanded/drawer) · `DateRangePicker` (presets/custom/timezone).

**Charts:** `TimeSeriesChart` (live/historical/stale/partial/empty/error) · `ThresholdOverlay` (configured/missing/hidden) · `AnomalyMarker` · `ForecastOverlay` (later) · `ChartLegend` · `ChartToolbar` · `ChartDataTable` · `RiskRankingChart` (P1) · `DistributionChart`.

**Infrastructure:** `SiteTree` · `AssetCard` · `AssetTableRow` · `SensorCard` · `SensorMetricSelector` · `DeviceConnectionStatus` (online/offline/reconnecting/unknown) · `AssetCriticalityLabel`.

**Operations:** `AlertCard` (new/read/acknowledged/resolved/suppressed) · `IncidentCard` (detected/triaged/assigned/investigating/resolved/closed) · `IncidentSeverityPanel` · `AssignmentControl` (unassigned/assigned/no eligible users/saving/error) · `IncidentTimeline` · `WorkOrderCard` (draft/open/assigned/in progress/blocked/completed/cancelled) · `WorkOrderChecklist` · `MaintenanceScheduleItem` · `CommentComposer` · `AttachmentList`.

**Simulator:** `SimulationModeBanner` (active/paused/stopped/historical) · `ScenarioSelector` · `SimulationControlBar` (idle/running/paused/stopping/failed) · `SimulationSpeedControl` · `FaultInjectionPanel` (available/scheduled/active/completed) · `SimulationRunSummary` · `SimulationEventLog` (streaming/paused/empty/error).

**Forms:** text input · number input with unit suffix · select / searchable select · multi-select · checkbox · radio group · switch · textarea · date/time picker · file upload · search input · inline hint/error · form section & summary.

**Overlays:** OV-01 org switcher · OV-02 site filter popover · OV-03 notification panel · OV-04 create menu (permitted actions only) · OV-05 confirm dialog · OV-06 assign-user dialog · OV-07 date/time range picker · OV-08 metric tooltip · OV-09 command palette · OV-10 toast/inline feedback · OV-11 empty-state panel · OV-12 data freshness badge.

**Priority:** Foundation → `AppShell, Sidebar, TopBar, PageHeader, Button, Input, Select, StatusBadge, SeverityBadge, MetricCard, DataTable, Dialog, Toast, Tabs, EmptyState, Skeleton`. MVP operational → `AssetCard, SiteTree, SensorMetricRow, TimeSeriesChart, AlertCard, IncidentTimeline, AssignmentControl, WorkOrderCard, SimulationControlBar, SimulationEventLog`. Later → `ForecastOverlay`, comparison charts, chart builder, report widgets.

### 14.2 Key component specs

**Button**

| Variant     | Default                                                     | Hover                                                                                                                | Pressed      | Disabled                         |
| ----------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------- |
| Primary     | `bg #F4E952`, text `#080808`, 600 14/20                     | slightly lighter/darker yellow token (e.g. `#F6FA45` is **not** a hover — define `brand-primary-hover` after review) | inset/darker | `surface-3` bg, `text-disabled`  |
| Secondary   | transparent / `surface-2`, `border-default`, `text-primary` | `surface-3`                                                                                                          | `surface-4`  | `text-disabled`, `border-subtle` |
| Ghost       | no fill                                                     | `surface-3`                                                                                                          | `surface-4`  | `text-disabled`                  |
| Destructive | `status-critical` fill (dark text) or critical border/text  | darker critical                                                                                                      | —            | —                                |

Radius `radius-md`. Loading: spinner + preserved label (or progress text), `aria-busy`, disabled to prevent duplicate submit. Labels are verbs (`Create asset`, `Acknowledge alert`, `Stop simulation`) — avoid `Submit/OK/Proceed`. One primary CTA per region.

**Input / Select:** label above (persistent), placeholder never replaces label, `surface-2` bg + `border-default`, focus → lime ring + `border-strong`, error → critical border + icon + message (never border color alone), required/optional marked consistently, disabled ≠ read-only visually, helper text adjacent, number input shows unit as a separate suffix.

**Card / MetricCard:** `surface-2`, `border-subtle`, `radius-lg`, padding 24 (16 compact). MetricCard = label (500 12/16) + value (Mono metric) + unit + observed time + freshness/quality + optional trend with defined comparison period. Clickable cards need a real interactive affordance and drill to filtered pages. No decorative sparklines without defined meaning. Unavailable → "—" with explanation, never `0`.

**StatusBadge / SeverityBadge:** text label always + optional icon/shape; status color text/icon on subtle tinted bg; `radius-sm` or `radius-full`; 600 11–12/16. Fixed semantics app-wide. `SIMULATED` badge: gold accent + text.

**FreshnessIndicator:** `Live` (+ updated timestamp) · `Delayed` · `Stale` (+ last received) · `Unavailable` · `Waiting for first data` · `Simulated`. Never hover-only.

**DataTable:** semantic `<table>` with caption/accessible name and `scope`d headers; visible sort direction (`aria-sort`); row navigation doesn't conflict with row actions; status = text + marker; numeric right-aligned mono; skeleton preserves geometry; distinct empty vs filtered-empty; selection checkboxes only with bulk actions; primary identifier column stays visible on narrow/scroll.

**Tabs:** `role="tablist"`, arrow-key navigation, selected 600 + indicator.

**Dialog:** title describes decision (not "Are you sure?"); verb primary action; destructive uses critical styling; focus trap; restore focus to trigger; Escape only when safe; never silently discard input.

**Drawer:** preserves parent context; title + close; 360–420 (480–560 wide); becomes full-screen sheet on mobile.

**Toast:** brief, non-blocking, dismissible; never sole evidence of critical change; never cover modal actions or mobile primary actions/bottom nav.

**EmptyState:** what's empty → why → next action (one primary).

---

## 15. Interaction specifications

### 15.1 Global principles

1. Clear affordance for every control. 2. Timely feedback: pending → success / actionable failure. 3. Prevent duplicate submissions. 4. Preserve safe input on errors. 5. Never silently discard unsaved changes. 6. Never color/animation as sole signal. 7. Permission-aware UI + backend enforcement. 8. Clear tenant-scoped cache on org change. 9. Distinguish current/stale/delayed/missing/simulated. 10. Confirm destructive/high-impact actions only — not routine navigation or filters.

### 15.2 Navigation

- Sidebar: parent click toggles group; route click navigates + updates active state; mobile drawer closes after successful navigation.
- Org switcher: active memberships only (name + optional segment); transition state; on failure show safe error and **don't** render cached data; focus returns to switcher on close without selection.
- Breadcrumbs: valid parent routes; current not a link.

### 15.3 Forms

- Labels persist; validate on submit (on blur for simple fields; not aggressively while typing). Errors explain how to fix. Form-level/server errors near heading or submit area; error summary for multiple errors.
- Submit disables duplicates + shows progress; success confirms + offers a sensible next action.
- Unsaved changes: confirm only if changes would be lost — **Stay** / **Discard** (+ **Save draft** only if drafts exist).
- No redundant confirmation after routine create/update. Confirm: irreversible delete, membership removal/revocation, simulator reset discarding state.

| Field           | Rule                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------- |
| Name            | Trim; non-empty; show length limits                                                         |
| Identifier/code | Normalize per policy; show duplicate conflict without clearing value                        |
| Email           | Validate format; never reveal account existence in recovery                                 |
| Password        | Show requirements up-front; accessible visibility toggle; support password managers & paste |
| Date/time       | Show timezone; reject invalid range; explain due-date constraints                           |
| Numeric metric  | Type, precision, schema range; unit shown separately                                        |
| Unit            | Select from supported units; no incompatible changes without conversion policy              |
| Assignee        | Only eligible active members                                                                |
| Notes           | Preserve content; show character guidance                                                   |

### 15.4 Tables & filters

- Sort: visible direction; documented default; preserves filters/pagination; sorts on underlying values.
- Filter: chips/visible controls; **Clear all** → documented default; counts & rows consistent; server-side tenant scope regardless.
- Row: actions never trigger row navigation; keyboard reaches destination and actions separately; destructive actions in labeled menu/dialog.
- Pagination preserves filters/sort; loading keeps context; live updates don't move the user's current row or page without notice.

### 15.5 Telemetry & real-time

- Live values update without reload; small last-updated indicator; tabular numerals + stable containers (no width jitter).
- Updates stop → transition to delayed/stale per policy. Realtime channel disconnected but history available → explain "Live updates disconnected" while showing last known data.
- Reconnect never duplicates chart points or alerts.
- Historical range change → loading within chart region; invalid ranges show inline validation, no misleading query; empty ranges explain.
- Chart points keep source timestamps; display in selected timezone; never interpolate missing data as normal.
- Live updates must not reset a user's selected range or steal focus.

### 15.6 Alerts

- Acknowledge: authorized roles & valid states only; pending state; success updates status + actor + timestamp in history; if changed since load → refresh + explain conflict.
- Detail shows trigger reason, value, threshold/rule, asset, site, event time, freshness. **Create incident** prefills context; if linked → **Open incident** instead. Duplicates link to canonical record.
- Only valid transitions offered — no generic status dropdown.

### 15.7 Incidents

- Lifecycle (initial): **Detected → Triaged → Assigned → Investigating → Resolved → Closed** (reopen if supported; follow backend state machine). Show allowed next actions only.
- Assignment: search eligible members (name, role, site eligibility); reassignment logs activity; invalid assignee before save → preserve form, request new choice.
- Notes: timestamped + attributed; audit-sensitive records not silently overwritten; empty state explains purpose.
- Resolution: summary when mandated; warn/block if open work orders remain; update timeline + asset history.

### 15.8 Work orders

- Creation prefilled from asset/incident; validate asset & assignee in same org; priority + due date clear; warn if assignee required but missing; unassigned allowed only by policy and labeled **Unassigned**.
- Technician: My Work Orders primary queue; detail prioritizes instructions, asset/location, linked incident, safety notes, required completion fields; Start only for valid status/assignee; completion form retains values after validation error; clear distinction between **Save draft** and **Complete/Submit**; submission creates history entry.
- Review: reviewer sees findings first; **Request changes** returns to valid work state with reason; **Close** permission-gated; closed work orders not silently editable (explicit, audited correction path).

### 15.9 Notifications

Clickable when a valid destination exists; read/unread not color-only (dot + weight + label); optimistic mark-read only if recoverable; authorized events only; reset on org switch; dismissing never removes the underlying critical incident.

### 15.10 Menus

All items keyboard accessible; disabled items explain why when discoverability matters; no unrelated actions grouped.

### 15.11 Feedback states

| State              | Do                                              | Avoid                                 |
| ------------------ | ----------------------------------------------- | ------------------------------------- |
| Initial loading    | Skeleton matching content shape                 | Blank page                            |
| Background refresh | Small indicator; keep data + timestamp          | Full-page flash                       |
| Empty              | Why + next action                               | Zero-value chart implying measurement |
| Filtered empty     | Show active filters + Clear filters             | First-run copy                        |
| Validation error   | Inline + summary                                | "Something went wrong"                |
| Network/API error  | Explain, preserve input, Retry, reference ID    | Silent failure / false success        |
| Permission error   | Safe explanation, route back / request access   | Exposing cross-tenant existence       |
| Success            | Persistent page state change (+ optional toast) | Toast as only evidence                |
| Conflict           | Refresh + explain data changed                  | Overwriting newer state               |

### 15.12 Analytics events (if enabled)

`organization_created`, `site_created`, `asset_created`, `sensor_configured`, `simulator_started`, `telemetry_first_received`, `monitoring_viewed`, `alert_acknowledged`, `incident_created`, `incident_assigned`, `work_order_created`, `work_order_started`, `work_order_submitted`, `work_order_closed`. Never send raw telemetry, secrets, PII, or sensitive notes.

---

## 16. Data states, telemetry & freshness

### 16.1 Required telemetry context

Metric name · current/latest value · unit · observed timestamp · last received/ingested timestamp (where relevant) · data quality · source (`Simulator` in MVP) · freshness state.

### 16.2 Freshness / quality vocabulary

| State                  | Meaning                             | UI                                                            |
| ---------------------- | ----------------------------------- | ------------------------------------------------------------- |
| Waiting for first data | Never received valid telemetry      | Neutral empty state + setup guidance ("Last received: never") |
| Live / Current         | Within configured window            | Neutral/live label + last-update time                         |
| Delayed                | Arriving late                       | Warning/info treatment + delay context                        |
| Stale                  | Exceeds freshness threshold         | Explicit Stale + last received; stop presenting as live       |
| Partial                | Some metrics missing                | Partial indicator + missing metric list                       |
| Invalid                | Failed validation                   | Quality notice/count; don't graph as valid                    |
| Offline                | Device/broker/simulator unavailable | Offline state — **not** healthy, distinct from asset health   |
| Unknown                | Can't determine                     | Unknown label + explanation                                   |
| Simulated              | Synthetic source                    | Persistent `SIMULATED`                                        |
| Unavailable            | No usable data in range             | Empty state + reason                                          |

Thresholds are **configured per stream/device class** — never hardcode a universal number.

### 16.3 No-data decision logic (UF-16)

No device → **Configure device** · Configured, never sent → **Waiting for first telemetry** · Simulator paused → **Paused** + Resume (permitted) · Simulator offline → **Simulator offline** + troubleshooting · Older than threshold → **Stale / Last received …** · Empty range but stream active → **No data in selected range** · Service down → system error + retry, **never a false zero**.

### 16.4 Distinctions to preserve

Total assets ≠ monitored assets · No telemetry ≠ healthy · Simulator running ≠ receiving fresh telemetry · Simulator paused ≠ offline · Stale ≠ offline · Read ≠ acknowledged · Acknowledged ≠ resolved · Risk ≠ current operational state · Unknown ≠ low risk · Counts state whether current, time-windowed, or all-time.

---

## 17. Data visualization

### 17.1 Principles

Context before decoration · actual vs predicted visually distinct · gaps remain gaps · thresholds show source/type · anomalies link to evidence · comparisons need common units/periods · accessible text/table alternatives. A chart that hides stale/missing data is a **product defect**.

### 17.2 Required chart context

Asset (name + ID, or site-level scope) · metric · explicit unit (°C, mm/s, V, A, kW, bar, Hz, %) · time range + timezone · data state · aggregation (raw, 1‑min avg, 5‑min avg…) · threshold source (configured / reference / **Not configured**) · last update (ingestion vs event time). Incompatible units never share an axis without a clear, justified second axis.

### 17.3 Chart selection

| Question             | Use                                                      | Avoid                     |
| -------------------- | -------------------------------------------------------- | ------------------------- |
| Change over time     | Line                                                     | Pie, decorative gauge     |
| Inside a range?      | Line + threshold lines/bands with labels                 | Color-only background     |
| Highest-risk assets  | Sorted horizontal bar / ranked table                     | 3D                        |
| Health distribution  | Stacked bar or donut + text legend + exact counts        | Unlabeled donut           |
| Site comparison      | Grouped/stacked bar or small multiples, same units/range | Scale-obscuring dual axis |
| When events occurred | Timeline / event markers                                 | Unlabeled scatter         |
| Actual vs forecast   | Line + forecast boundary + valid confidence band         | One continuous line       |
| Around an incident   | Evidence window with annotations                         | Score without evidence    |

### 17.4 Encoding

- Observed: **solid** line. Forecast: **dashed**. Estimated/interpolated: separate, labeled style. Missing: **gap**.
- Series colors: Soft Yellow = primary highlighted series; Neon Lime = secondary/selected; Golden Yellow = comparison or configured threshold where clear. **Never** distinguish series by yellow hues alone → add line patterns, point shapes, direct labels, or small multiples.
- Grid lines: muted neutrals (`border-subtle`/`border-default`). Axes & labels: Cool White / `text-secondary`.
- Warning/critical markers & threshold lines use **semantic status colors** + distinct line style (e.g. warning dashed, critical dash-dot) + text label ("Warning 85 °C · configured").
- Anomaly markers: distinct **shape** (e.g. diamond/triangle) + annotation, not just color.
- Threshold types: warning, critical, operating target/range, reference range. Missing → "Not configured" — never fabricate a safe range or imply manufacturer limits.

### 17.5 Anomalies & predictions

- Anomaly marker provides: event ID/link, detection time, asset & metric(s), type/model/rule source, severity or score with meaning, supporting window, link to detail. Label uncalibrated as **Anomaly score**. Multivariate: show key contributors in detail view.
- Predictions: predicted vs observed, horizon, model/version (technical users), confidence band **only if real**, prediction timestamp, data window, limitations/unavailable state. No failure-probability % unless calibrated with defined horizon.
- Risk/health: numeric + labels, explain scale/thresholds/inputs, distinguish risk vs state and unknown vs low, show input age/quality, "Insufficient data" when missing, link to rationale. No unexplained circular gauges.

### 17.6 Portfolio analytics

Show scope, reporting period, inclusion/exclusion rules, assets included vs unavailable, definitions/denominators. Normalize only with clear denominators. Simulated data excluded from production reports unless explicitly included and labeled.

### 17.7 Time

UTC at service boundary; display in user or site timezone, labeled. Distinguish event vs ingestion time. State inclusive endpoints + timezone for ranges. Disclose aggregation; don't mix raw & aggregated silently. Handle DST without duplicate/missing labels.

### 17.8 Interaction

Tooltips reachable by keyboard/focus; show timestamp, value, unit, series, quality, source, status. Brush/zoom has visible **Reset**. Legend toggles keyboard-accessible and show hidden state. Clicking anomaly opens detail. Range changes preserve asset & metric. Freshness shown outside the chart too.

### 17.9 Responsive charts

Desktop: multiple aligned charts. Tablet: stack when crowded. Mobile: **one metric at a time** with metric selector (or small multiples); keep unit, last update, freshness, thresholds, anomalies visible; no tiny multi-axis charts; reduce ticks/shorten date labels before shrinking text.

### 17.10 Required Figma examples

Generator temperature with warning & critical thresholds · vibration trend with anomaly markers · voltage/current with units · asset risk ranking · health distribution · actual-vs-forecast (later, "Preview") · stale telemetry state · missing/partial data state · no-threshold-configured state · simulated banner + chart treatment.

---

## 18. Alerts, incidents, notifications

### 18.1 Domain distinction

| Object          | Definition                                 | Example                                                   |
| --------------- | ------------------------------------------ | --------------------------------------------------------- |
| Telemetry event | Received measurement/state                 | Generator temperature = 86.5 °C                           |
| Anomaly event   | Rule/model finds unusual behavior          | Temperature trend differs from baseline                   |
| Alert           | User-facing attention item                 | Warning: generator temperature above configured threshold |
| Incident        | Managed issue with assignment & resolution | Investigate Generator-01 overheating                      |
| Notification    | Delivery/inbox message                     | You were assigned an incident                             |
| Work order      | Assigned maintenance task                  | Inspect Generator-01 cooling system                       |

Anomaly ≠ automatic incident (policy-driven). One incident may have 0..n work orders.

### 18.2 Alert taxonomy

Threshold exceeded · Anomaly detected · Device offline · Telemetry stale/incomplete · Asset state changed · Maintenance due/overdue · Work order assigned/updated · Incident escalated/reassigned · Simulator scenario event (demo only). Each alert: category, severity, title, description, asset/site, occurred-at, last-updated, source, next action.

### 18.3 Severity (operational, ≠ ML score)

| Severity      | Meaning                | UX                                                                       |
| ------------- | ---------------------- | ------------------------------------------------------------------------ |
| Informational | Context only           | Normal inbox item, no interruption                                       |
| Low           | Review when convenient | Badge + notification center                                              |
| Warning       | Attention required     | Highlighted; ack may be required                                         |
| High          | Prompt investigation   | Strong treatment + configured delivery                                   |
| Critical      | Urgent review          | Persistent prominent alert until acked/resolved per policy (no flashing) |

Map: Informational→info, Low→info/neutral, Warning→warning, High→critical tint (with "High" label + distinct icon), Critical→critical. Response SLAs configured per org — never hardcoded in UI.

### 18.4 Alert lifecycle

```text
OPEN → ACKNOWLEDGED → RESOLVED
  └──────────────→ SUPPRESSED (policy-controlled)
```

Acknowledged = someone accepted review responsibility (condition not fixed). Resolved = condition cleared/handled. Suppressed = muted duplicates/noise under authorized policy; history remains. Alert resolution doesn't auto-close incidents unless workflow allows.

### 18.5 Other lifecycles

- Incident: Detected → Triaged → Assigned → Investigating → Resolved → Closed (don't reuse "Acknowledged").
- Work order: Draft · Open · Assigned · In Progress · Ready for Review · Blocked · Completed/Closed · Cancelled (only states backend supports).
- Maintenance schedule item: Upcoming · Due · Overdue · Completed · Cancelled.

### 18.6 Notification center

- Header: title, unread count, mark-all-read (if permitted). Filters: All · Unread · Alerts · Incidents · Assignments · System.
- Row: severity/category icon, title, summary, asset/site, timestamp, unread indicator. Detail: full description, source event, related records, actions, audit trail.
- Ordering consistent and documented; critical items never buried by later low-severity items.
- **Read** (personal) ≠ **Acknowledged** (operational). Opening marks read, never auto-acknowledges.

### 18.7 Acknowledgement UX

Label `Acknowledge`; show acknowledger + time; reason only when policy demands; permission-gated; if already acked show owner + next action; never implies the condition is fixed.

### 18.8 Incident creation/linking

Explain why recommended/required; show existing open incidents for same asset/event family; link alert ↔ anomaly ↔ risk assessment ↔ incident; preserve original timestamps & source IDs; route to existing incident instead of duplicating; make auto-creation policy visible to admins.

### 18.9 Escalation & delivery

Show trigger condition, destination (role/team/user), history + timestamps, current owner, next expected action. Delivery states only as confirmed: `Queued`, `Sent`, `Delivered` (if supported), `Failed`, `Retrying`. MVP channel: in-app (email later). Mandatory critical delivery not overridable by personal prefs unless org policy allows; attempts auditable; failures visible to admins; no sensitive details in email subjects / lock-screen previews.

### 18.10 Grouping & suppression

Grouped alerts show count + most recent occurrence; individual occurrences inspectable; explicit ack/resolve semantics for groups; suppression shows scope, duration, reason, actor; never erases history.

### 18.11 Alert detail content (in order)

1 title + severity · 2 status · 3 asset/site · 4 trigger time + last occurrence · 5 rule/model source (+version) · 6 trigger reading + unit + threshold/reference · 7 freshness & quality · 8 supporting chart window · 9 related anomalies & incidents · 10 recommended next action (labeled guidance) · 11 activity/audit timeline. No speculative root-cause claims; use "condition detected" / "threshold exceeded".

### 18.12 Edge states

Delivery failed · already acknowledged · resolved while viewing · linked asset archived · user lost site access · duplicate event · stale/incomplete source data · preference changed during queued delivery — each explains what happened + next step.

### 18.13 Simulated alerts

`SIMULATED` / `DEMO DATA` in list and detail; distinct from live without changing severity meaning; demo filter; excluded from production reports unless explicitly included.

---

## 19. Simulator experience

### 19.1 Rules

First-class capability for demos, dev, QA, reproducible AI experiments — **never** a physical control interface. Wording: `Start simulation`, `Pause simulation`, `Resume simulation`, `Stop simulation`, `Inject simulated fault`. Never `Start generator`, `Power on equipment`. Placement: **Monitoring → Simulator** (`/app/monitoring/simulator`) and asset Simulator panel; visible only to authorized roles (PLAT, OWN, FM; ENG configurable) in demo/dev contexts; default disabled outside demo/staging.

### 19.2 Anatomy

- **Header:** title `Simulator` / `Simulation Console`; persistent `SIMULATED DATA` badge; org/site context; run ID + run status.
- **Scenario config:** asset selector (Generator-01), scenario selector + description, duration/run mode, speed presets, seed/reproducibility ID, sampling interval (advanced), Start.
- **Controls:** Start · Pause · Resume · Stop · Reset/new run (confirm if data cleanup) · Fault injection (supported scenarios + authorized roles).
- **Live run view:** state, elapsed simulated time, scenario, generated metrics, latest measurements, event log, link to asset monitoring, event rate, last event.
- **Run history:** run ID, scenario, start/end, initiating user, seed/config summary, outcome (completed/stopped/failed), link to data & events.

Visual treatment: neutral surfaces with gold `SIMULATED` accents and a sandbox/test-data feel; avoid power-button iconography, industrial switch skeuomorphism, or red/green "machine on/off" styling.

### 19.3 Scenarios

| Scenario                | Behavior                                | Product UX                                  |
| ----------------------- | --------------------------------------- | ------------------------------------------- |
| Normal operation        | Stable values in simulated range        | Operational state, stable charts            |
| Progressive overheating | Temperature rises over time             | Threshold event + anomaly evidence          |
| Abnormal vibration      | Vibration departs baseline              | Vibration anomaly marker + details          |
| Cooling degradation     | Correlated cooling + temperature change | Multi-metric evidence view                  |
| Electrical instability  | Voltage/current/frequency variation     | Electrical alert + chart evidence           |
| Sudden shutdown         | Run state changes, measurements stop    | Asset/device state + stale/offline behavior |

Initial generator metrics: engine/coolant temperature, vibration, output voltage, output current/load %, frequency, running state/operating hours. Values are not certified operating limits.

### 19.4 Run state model

```text
IDLE → STARTING → RUNNING ↔ PAUSED → STOPPING → COMPLETED
                  └──────────────────────────→ FAILED
```

(Wireframe variant: Not configured → Ready → Starting → Running ↔ Paused → Stopping → Stopped; error/offline separate.) UI reflects **backend-confirmed** state only — show `Starting` until confirmed `Running`; disable incompatible actions; process failure shows **Simulator offline**, not a frozen "Running". FAILED shows diagnostic reference + retry if safe.

### 19.5 Fault injection

Show supported faults; explain it modifies synthetic output only; config limits + validation; scheduled/active/completed state; confirm disruptive changes during active run; record who/when/config; no arbitrary payloads or scripts.

### 19.6 Isolation & labeling

Every record carries `SIMULATOR` source + `simulationRunId`. Persistent simulation banner; `SIMULATED` on asset, chart, alert, incident, work-order contexts; analytics include/exclude filter; never mix simulated + real in one KPI without label & inclusion rule.

### 19.7 Failure states

Service unavailable · invalid config · start timeout · permission lost mid-run · fails after partial generation · stream disconnect · stop pending · active run blocks new start · completed but downstream processing delayed. Never infer failure from a delayed browser event alone.

### 19.8 Primary demo flow

Open Simulator → select Generator-01 → Normal operation → Start → Live Monitoring → Pause → Resume with Progressive overheating (or fault) → observe threshold/anomaly → open alert → create/inspect incident → assign work order + document simulated inspection → Stop → run history.

### 19.9 Permissions

View state: facility/operational roles · Start/stop: admin/owner/facility manager (configurable) · Change parameters: elevated · Inject faults: explicit permission, never read-only · Delete/reset records: restricted + audited.

---

## 20. Screen inventory & page specs

Priority: **P0** MVP required · **P1** MVP enhancement · **P2** later.

| ID    | Screen                                | Route                                     | Roles                         | Pri                   |
| ----- | ------------------------------------- | ----------------------------------------- | ----------------------------- | --------------------- |
| SC-01 | Sign in                               | `/login`                                  | All                           | P0                    |
| SC-02 | Sign up                               | `/register`                               | New user                      | P0                    |
| SC-03 | Forgot password                       | `/forgot-password`                        | All                           | P0                    |
| SC-04 | Verify email / Accept invitation      | `/verify-email`, `/invite/accept`         | New/invited                   | P0/P1                 |
| SC-05 | Create organization                   | `/onboarding/create-organization`         | New owner                     | P0                    |
| SC-06 | Onboarding checklist                  | `/onboarding`                             | OWN, FM                       | P0                    |
| SC-07 | Dashboard                             | `/app/dashboard`                          | All (personalized)            | P0                    |
| SC-08 | Site list                             | `/app/infrastructure/sites`               | OWN, FM, ENG, VIEW            | P0                    |
| SC-09 | Create/Edit site                      | `…/sites/new`, `…/[siteId]/edit`          | OWN, FM                       | P0                    |
| SC-10 | Site detail                           | `…/sites/[siteId]`                        | OWN, FM, ENG, TEC (ltd), VIEW | P0                    |
| SC-11 | Buildings/Areas                       | `…/buildings`                             | OWN, FM, ENG, VIEW            | P1                    |
| SC-12 | Asset list                            | `…/assets`                                | All (TEC ltd)                 | P0                    |
| SC-13 | Create/Edit asset (3-step wizard)     | `…/assets/new`, `…/edit`                  | OWN, FM, ENG                  | P0                    |
| SC-14 | Asset detail — Overview               | `…/assets/[assetId]`                      | All authorized                | P0                    |
| SC-15 | Asset sensors & devices               | asset tab / `…/sensors`                   | OWN, FM, ENG                  | P0                    |
| SC-16 | Asset monitoring                      | asset tab                                 | All (TEC ltd)                 | P0                    |
| SC-17 | Asset alerts & history                | asset tab / `…/history`                   | All (TEC ltd)                 | P0                    |
| SC-18 | Sensor list                           | `…/sensors`                               | OWN, FM, ENG, VIEW (ro)       | P0                    |
| SC-19 | Sensor detail/config                  | `…/sensors/[sensorId]`                    | OWN, FM, ENG                  | P0                    |
| SC-20 | Live monitoring                       | `/app/monitoring/live`                    | All (TEC ltd)                 | P0                    |
| SC-21 | Historical query / Telemetry Explorer | `/app/monitoring/telemetry`               | OWN, FM, ENG, VIEW            | P0                    |
| SC-22 | Alert inbox                           | `/app/alerts`                             | All (policy)                  | P0                    |
| SC-23 | Alert detail                          | `/app/alerts/[alertId]`                   | All (policy)                  | P0                    |
| SC-24 | Incident list                         | `/app/incidents`                          | All (TEC assigned, VIEW ro)   | P0                    |
| SC-25 | Create incident                       | `/app/incidents/new` or modal             | OWN, FM, ENG                  | P0                    |
| SC-26 | Incident detail                       | `/app/incidents/[incidentId]`             | All (TEC assigned, VIEW ro)   | P0                    |
| SC-27 | Work order list                       | `/app/work-orders`                        | All (VIEW policy)             | P0                    |
| SC-28 | Create/Edit work order                | `/app/work-orders/new`                    | OWN, FM, ENG                  | P0                    |
| SC-29 | Work order detail                     | `/app/work-orders/[workOrderId]`          | All (TEC assigned)            | P0                    |
| SC-30 | My work orders                        | `/app/my-work`                            | TEC                           | P0                    |
| SC-31 | Maintenance history                   | `/app/maintenance/records`                | All (TEC ltd)                 | P1                    |
| SC-32 | Maintenance schedule                  | `/app/maintenance/schedules`              | OWN, FM, ENG                  | P1                    |
| SC-33 | Basic analytics                       | `/app/analytics`                          | OWN, FM, VIEW; ENG ltd        | P1                    |
| SC-34 | Organization members                  | `/app/settings/members`                   | OWN                           | P0                    |
| SC-35 | Roles & access summary                | `/app/settings/roles`                     | OWN                           | P0 (read-only matrix) |
| SC-36 | Organization settings                 | `/app/settings/organization`              | OWN                           | P0                    |
| SC-37 | Profile & preferences                 | `/app/profile`                            | All                           | P0                    |
| SC-38 | Notifications center                  | `/app/notifications`                      | All                           | P0                    |
| SC-39 | Audit log                             | `/app/settings/audit-log`                 | OWN (FM ltd)                  | P1 (min P0)           |
| SC-40 | Simulator control                     | `/app/monitoring/simulator` / asset panel | OWN, FM, ENG                  | P0                    |
| SC-41 | Global search / quick switcher        | overlay                                   | Authorized                    | P1                    |
| SC-42 | Permission denied / access error      | state                                     | All                           | P0                    |
| SC-43 | System status / service error         | state                                     | All / PLAT                    | P0                    |

### 20.1 Page specifications (condensed)

**SC-01 Sign in** — Logo, email, password + visibility toggle, remember session (if supported), Sign in, Forgot password, Register. States: validation, invalid credentials, rate-limited, submitting, service unavailable, account disabled, session expired. Split-screen with `gridaware-pattern-dark.svg` backdrop allowed (form panel must stay clean, 420–480px). Privacy-safe errors.
**SC-02 Sign up** — Name, email, password (+confirm if needed), terms/privacy, password guidance. States: email registered (→ sign in/recover), weak password, verification pending (+resend), error. No org config here.
**SC-03 Forgot password** — Email, privacy-safe confirmation ("If an account exists…"), back to sign in.
**SC-04 Invitation** — Org name, invited email, proposed role shown **before** accepting. States: valid, expired, revoked, already accepted, wrong account, auth required. No tenant data pre-acceptance.
**SC-05 Create organization** — Name, display name, segment (Factory / Commercial Building), country/timezone. Explain tenant isolation. Owner membership created atomically.
**SC-06 Onboarding checklist** — Steps: confirm profile → create first site → add first asset (Generator 01) → configure simulated device/sensors → start simulator → confirm telemetry arriving → invite team (optional). Evidence-based completion (telemetry ✔ only after real event); required vs optional distinct; skipped ≠ complete; resumable; deep links to unfinished step.
**SC-07 / WF-01 Dashboard** — Question: _What needs my attention now?_ Order: title + context/date → org/site filter → KPI row (total assets, needing attention, active alerts, open incidents, work orders needing action) → asset status/monitoring coverage → active alerts & incidents → site/asset overview → recent activity → role task panel → data freshness / simulator status. 3–4 cards wide desktop (≤5), 2 compact, stacked mobile. Role variants: Owner org roll-up + site comparison; FM site ops; ENG alerts/incidents; TEC assigned work; VIEW read-only. Empty: welcome + setup checklist + one CTA **Create first site**; no zero-valued charts. No fabricated KPIs or predictive scores.
**SC-08 / WF-02 Site list** — Columns: site, code, location, assets, monitoring/data status, updated. Mobile card: name, location, asset count, status. Site with no telemetry = "Not monitored / No data", never 0% health. Empty: explain sites + **Add site**.
**SC-09 Create/Edit site** — Name (req), code (unique if configured), address, timezone, description, segment/type. Show timezone; persist UTC.
**SC-10 / WF-03 Site detail** — Breadcrumb → header (name, location, Edit) → summary strip (assets, devices receiving data, active alerts, open incidents) → asset list → alerts/incidents → optional buildings. Building not required.
**SC-12 / WF-04 Asset list** — Filters: site, type, connection/freshness, criticality, status. Columns: asset, type, site/location, criticality, device status, data freshness, active alerts, updated. Separate operational state, connection, freshness — never one colored dot. Empty states: no assets / no results / assets but no telemetry.
**SC-13 / WF-05 Asset wizard** — Step 1 Identity (name, type=Generator, code, site, optional building/area) → Step 2 Operational metadata (manufacturer/model/serial optional, criticality, description, installation) → Step 3 Review (explain sensor setup follows). Stepper, back/continue, inline validation, unsaved warning. Result status: **Awaiting sensor setup**, never Healthy.
**SC-14 / WF-06 Asset detail** — Header: name, type, code, site breadcrumb, freshness, Edit. Summary: criticality, device status, latest telemetry received, open alert/incident count. Tabs: **Overview · Monitoring (Live signals / History) · Sensors & Devices · Alerts & History · Maintenance · Configuration (authorized)**. Overview: current metric cards, recent alert/incident, metadata, activity, next action. States: awaiting sensor setup, configured/no telemetry (**Awaiting first telemetry** + setup action), live, stale, offline, archived. Canonical destination for all asset links.
**SC-15 / WF-07 Sensors & devices** — Asset context → device card with **Simulated** source + state → sensor table (name, metric, unit, source/device, latest event, quality/freshness, config state) → Add sensor → config summary + simulator launch. Device shows **Configured / Not yet sending** until data. No undocumented manufacturer ranges as defaults.
**SC-16 Asset monitoring** — Metric selector, latest value/unit/time, freshness, range selector, trend charts, thresholds, annotations; timezone + simulated label visible.
**SC-17 Asset alerts & history** — Chronological list (date, type, severity/status, linked incident, summary), filter by type.
**SC-18/19 Sensors** — List: name/id, asset, metric, unit, device, latest reading time, quality/connection. Detail: identity, linked asset/device, metric/unit, config, latest event, history. Unit changes never silently reinterpret history.
**SC-20 / WF-09 Live monitoring** — Title + context → filters (site, asset, metric, window) → latest reading cards (value + unit + observed time + freshness) → main trend chart → secondary charts / metric selector → event/alert annotations + asset list. Optional pause visual auto-refresh. Mobile: single metric + selector.
**SC-21 Telemetry Explorer** — Range, metric/asset selectors, chart + table view, timezone, unit/quality; exports only when approved. States: invalid range, empty range, large-query loading, unavailable.
**SC-22 / WF-10 Alert inbox** — Count summary; filters status, severity, site, asset, type, time; columns severity, title/type, asset, site, detected, last occurrence, status, linked incident. Acknowledge inline only if safe — else on detail. Distinguish alert vs incident clearly.
**SC-23 / WF-11 Alert detail** — Severity/status header → what & when → asset/site → detection reason (rule + observed value, or model info when validated) → chart around event → history + freshness → related incident panel → primary action **Acknowledge** or **Create/Open incident** by state.
**SC-24 / WF-12 Incident list** — Open/critical counts; filters status, severity/priority, assignee, site, date; columns ID/title, severity, status, asset, site, assignee, created/updated, linked alerts, work orders. Default sort: unresolved + high priority first (predictable).
**SC-25 Create incident** — Title, description, asset, site, linked alert (prefilled), severity/priority, assignee; duplicate/link warning.
**SC-26 / WF-13 Incident detail** — Desktop two-column: **main** (title/description, timeline, investigation notes, linked alerts, linked work orders, resolution summary) + **side** (status, severity, asset/site, assignee, created, allowed next actions). Mobile: summary card first, then timeline.
**SC-27/30 / WF-14 Work orders** — Manager table: ID/title, status, priority, asset/site, assignee, due, linked incident, updated. Technician My Work: assigned, due/overdue indicator, site/asset, priority, status, next action; no admin controls. Mobile: cards.
**SC-28 Create work order** — Title, instructions, asset, site, linked incident, priority, assignee, due date, optional checklist/safety notes; prefilled from context.
**SC-29 / WF-15 Work order detail** — Title/status/priority → assignment/due → instructions → asset/site → linked incident & alert context → technician findings/actions form → activity timeline → review/close actions (authorized). Mobile-friendly completion form that preserves input.
**SC-31 Maintenance history** — Date, asset, work order, technician, summary, outcome. Don't show schedule management unless implemented.
**SC-33 Analytics** — Asset status counts, alert/incident trend, work-order completion, telemetry coverage/freshness, range; definitions & denominators; simulated marked; "Insufficient history" state.
**SC-34 / WF-16 Members** — Name/email, role, membership status, invitation status, last activity; invite, resend/revoke, change role, deactivate (confirm). Distinguish user account vs membership. No secrets.
**SC-35 Roles** — Read-only permission matrix in MVP.
**SC-36 Org settings** — Name, segment, timezone/locale, optional logo/contact; no unsupported compliance/retention controls.
**SC-37 Profile** — Name, email (verification policy), password/security, timezone, notification prefs; re-auth when required.
**SC-38 / WF-17 Notifications** — §18.6.
**SC-39 Audit log** — Actor, action, entity, timestamp, org/site, outcome, safe metadata; filters; never secrets/tokens/raw payloads.
**SC-40 / WF-08 Simulator** — §19.
**SC-42 Permission denied** — Concise message, safe context, Return to dashboard / Switch organization / Request access; no existence leak.
**SC-43 Service error** — Affected capability, impact, time, retry guidance, copyable reference/request ID; distinct from validation errors.

### 20.2 States every data page must specify

Initial loading · background refresh · empty (no records) · empty (filtered) · no telemetry ever · stale/delayed · simulator paused/unavailable · partial data/partial dependency failure · permission denied · validation error · network/API failure · success after mutation · unsaved changes.

### 20.3 Wireframe stress content

Long asset/org/site/user names, no assignee, missing dates, unusually large values, translated/long status strings. Never real customer data. Low-fi: grayscale + annotations (`Primary`, `Secondary`, `Optional`, `Role-gated`, `Live`, `Stale`, `Simulated`).

---

## 21. User flows

| ID    | Flow                                     | Actor          | Key UX requirements                                                                                                                                                           |
| ----- | ---------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UF-01 | Register & create organization           | Owner          | Duplicate email → sign-in/recovery; verification pending + resend; retain values on failure; lands on onboarding with new org selected                                        |
| UF-02 | Join invited organization                | Invited user   | Validate token/expiry/email; show org + role before accept; expired/revoked/used/mismatched states; already-member confirmation; org appears in switcher                      |
| UF-03 | Complete onboarding                      | Owner          | Checklist §20.1 SC-06; done when ≥1 site + generator + simulator configured + valid telemetry received                                                                        |
| UF-04 | Create site                              | Owner/FM       | Name required; inline duplicate/timezone errors; opens site detail with Add asset prompt                                                                                      |
| UF-05 | Register generator                       | FM/ENG         | Guide to create site if none; hide/disable without permission (+reason); duplicate ID preserves values; result "Awaiting sensor setup"                                        |
| UF-06 | Configure simulated device & sensors     | ENG/FM         | Add simulated device, map metrics (name/unit/type); reject duplicates/unsupported units/device on other asset; "Configured / Not yet sending"                                 |
| UF-07 | Start & control simulator                | ENG/FM         | Normal operation first; simulated-data warning; Starting→Running only on confirmation; broker down → failure + config preserved; no device → UF-06; crash → Simulator offline |
| UF-08 | Monitor live & historical                | FM/ENG/VIEW    | Latest value + unit + time + freshness + source; observed vs ingestion time; per-stream stale threshold; preserve metric/range within asset; explain which empty state        |
| UF-09 | Detect & review alert                    | ENG/FM         | Dedup into existing alert; full detail context; ack per policy; stale data prominent                                                                                          |
| UF-10 | Alert → incident                         | ENG/FM         | Prefill asset/site/alert/description/severity; link both ways; no duplicates; auto-create only by explicit policy                                                             |
| UF-11 | Assign & investigate incident            | ENG/FM         | Filter queue; assign eligible member; valid transitions only; notes; create work order; read-only for unauthorized                                                            |
| UF-12 | Create & assign work order               | ENG/FM         | Prefill context; title/description/priority/due/instructions/assignee; notify assignee; Unassigned only by policy                                                             |
| UF-13 | Complete work order                      | Technician     | My Work → detail → Start → findings/actions/parts/notes → Ready for review/Completed; return to In progress; failed inspection → new incident/escalation                      |
| UF-14 | Review & close                           | ENG/FM         | Review findings; record decision (platform does not control equipment); approve or request info; close WO; resolve incident with summary; history updated                     |
| UF-15 | Switch organization                      | Multi-org user | Active memberships only; transition state; clear caches; reset/restore site only if valid; revoked → access error + valid route                                               |
| UF-16 | Recover from no-data / simulator failure | FM/ENG         | Decision logic §16.3                                                                                                                                                          |
| UF-17 | Review maintenance history               | FM/ENG/VIEW    | P1                                                                                                                                                                            |

Cross-flow: preserve asset→alert→incident→work-order links and breadcrumbs; distinct status vocab per domain (never a bare "Active"); confirm only destructive actions; consistent `SIMULATED DATA` label in telemetry, charts, alerts, reports, exports.

Figma flow groups: Account & Organization (UF-01–03), Infrastructure Setup (UF-04–07), Monitoring & Alerts (UF-08–10, 16), Incident & Maintenance (UF-11–14), Tenant Navigation (UF-15). Each: happy path + ≥1 error/empty/permission branch, nodes labeled with Flow IDs.

---

## 22. Responsive design

Desktop is primary; tablet supported for managers/engineers on the move; mobile for focused field tasks, quick status checks, notifications, technician workflows (not full analytics parity).

**Principles:** preserve task completion · keep identity/status/freshness/severity/next action visible · transform, don't compress · actions reachable (no hover-only) · no hidden meaning (provide reveal for truncation/summaries) · touch targets 44×44 · **no horizontal page overflow** (only in clearly marked data regions).

| Band         | Width     | Behavior                                                                     |
| ------------ | --------- | ---------------------------------------------------------------------------- |
| Small mobile | 320–374   | Single column, essential actions, bottom sheets                              |
| Mobile       | 375–767   | Single column, drawer nav, card lists                                        |
| Tablet       | 768–1023  | Selective 2-col, collapsed/overlay sidebar, simplified charts, filter drawer |
| Desktop      | 1024–1439 | Full sidebar, multi-column                                                   |
| Wide         | 1440+     | Max-width 1600, avoid long lines                                             |

| Page                | Desktop             | Tablet                                   | Mobile                                                                             |
| ------------------- | ------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Dashboard KPIs      | 4–5 cols            | 2 cols                                   | 1–2 cols                                                                           |
| Health distribution | Chart + legend      | Compact legend                           | Summary values + compact chart, tap for detail                                     |
| Site comparison     | Chart/table         | Stacked                                  | Ranked list                                                                        |
| Recent incidents    | Table               | Compact table/cards                      | Cards: severity, title, asset, age, action                                         |
| Asset list          | Sortable table      | Keep name, status, site, risk, freshness | Cards: name, type, status, site, key risk, details                                 |
| Asset detail        | Multi-section       | Stacked + tabs/anchors                   | Identity/status, current readings, latest alert, quick actions; single-series tabs |
| Live monitoring     | Synchronized charts | Stacked charts                           | One metric + selector; unit, last update, freshness, threshold                     |
| Incident detail     | Side-by-side        | Main + collapsible panels                | Severity, status, asset, assignee, age, primary action first                       |
| Work orders         | Table + side panel  | Fewer columns / cards                    | Task card + prominent next action; touch-friendly forms                            |
| Simulator           | Full console        | Controls above log                       | Scenario select + start/pause/stop + status; advanced tuning may be desktop-only   |

Mobile: sticky bottom action for one primary task allowed (never covering content/keyboard/focus); breadcrumbs collapse; bulk actions may be disabled; toasts avoid bottom nav. Skeletons follow responsive geometry; error banners wrap with retry visible; offline/stale visible without hover.

**Test widths:** 320, 375, 430, 768, 820, 1024, 1100, 1280, 1366, 1440, 1920 + 200% zoom, long names, long translated strings, keyboard-only.

---

## 23. Accessibility

Target **WCAG 2.2 AA** (also ISO/IEC 40500:2025). Verified by automated (axe in dev/CI) + manual keyboard + screen reader + user testing. Principles: perceivable, operable, understandable, robust, **operationally safe** (no flashing/sound/color-only alerts).

- **Contrast:** §3.4 thresholds for every real combination and state.
- **Status:** text + icon/shape — `Critical` + alert icon; `Device Offline` + disconnected icon; `Data Stale` + clock icon + last-seen; `Simulated` + badge + explanation.
- **Keyboard:** logical tab order; visible unobscured focus; Enter activates buttons/links, Space buttons/toggles; Escape closes dismissible overlays; arrows for menus/tabs/radios/listboxes; no table keyboard traps; org switcher, date pickers, chart controls, filters, simulator controls all keyboard accessible. Prefer semantic `button`, `a`, `input`, `select`, `table`, `nav`, `main`, `header`, `form` — **no clickable divs**.
- **Semantics:** one `h1` per page; logical headings; landmarks; descriptive button names; icon-only labels; labels + associated hints/errors (`aria-describedby`, `aria-invalid`); table headers/scope/caption; `aria-sort`; decorative icons hidden.
- **Live regions:** restrained `aria-live="polite"` for meaningful events only (device disconnected, new critical alert, incident assigned); never per telemetry point; users can pause/mute non-essential announcements.
- **Forms:** persistent labels, required/optional, format guidance, inline errors, error summary, preserve valid input, confirmation for irreversible actions, success message with next step.
- **Charts:** title + text summary; data table alternative (`ChartDataTable`); axes/units/ranges identified; non-hover inspection.
- **Motion:** reduced motion respected; no auto-scroll; no flashing.
- **Touch:** ≥44×44 for frequent actions (WCAG min 24×24); no overlap when zoomed; no gesture-only controls; reflow at 320 CSS px; sticky bars clear of browser UI & keyboard.
- **Auth:** support password managers & paste; no cognitive tests as sole method; explain session expiry; preserve unsaved work.

Core a11y test set: sign in & switch org · navigate to site → asset · inspect current & historical telemetry · review anomaly → open incident · assign work order · complete technician update · operate simulator (start/pause/stop).

---

## 24. Content design & terminology

### 24.1 Voice

Professional, calm, precise, operationally helpful, direct, concise, transparent about uncertainty. Avoid marketing hype in workflows, certainty claims about AI, vague "Something went wrong" when cause is known, blame, unexplained abbreviations, exclamation marks.

### 24.2 Glossary

| Use                                 | Meaning                                          | Don't use as synonym              |
| ----------------------------------- | ------------------------------------------------ | --------------------------------- |
| Organization                        | Tenant/customer                                  | Company, account (except billing) |
| Site                                | Physical facility/location                       | Branch                            |
| Building                            | Building within a site                           | Facility (for buildings)          |
| Asset                               | Managed equipment                                | Device                            |
| Sensor                              | Measurement source on an asset                   | Asset, device                     |
| Device                              | Connected gateway/controller/sender identity     | Sensor                            |
| Telemetry                           | Time-stamped measurement/state data              | Logs                              |
| Measurement (Reading ok in UI copy) | Single metric value at a time                    | —                                 |
| Anomaly                             | Behavior differing from expected                 | Failure, defect                   |
| Alert                               | Attention item                                   | Incident                          |
| Incident                            | Managed operational issue                        | Alert, anomaly                    |
| Notification                        | Message delivered to a user                      | Alert                             |
| Work order                          | Authorized maintenance task                      | Ticket                            |
| Maintenance record                  | Completed service history                        | Work order                        |
| Risk assessment                     | Evaluated risk context                           | Failure prediction                |
| Failure probability                 | **Calibrated** output for defined target/horizon | Risk score                        |
| Anomaly score                       | Measure of abnormality                           | Failure probability               |
| Simulated data / Demo data          | Simulator-generated                              | Live data                         |
| Stale                               | Older than freshness expectation                 | Offline                           |
| Offline                             | Connection/heartbeat unavailable                 | Stale                             |

### 24.3 Status labels

- **Asset:** `Operational` · `Attention Required` · `Degraded` (if defined) · `Out of Service` · `Unknown` · `Awaiting sensor setup` · `Awaiting first telemetry`
- **Device:** `Online` · `Offline` · `Reconnecting` · `Unknown`
- **Telemetry:** `Live` · `Delayed` · `Stale` · `Partial Data` · `Invalid Data` · `Unavailable` · `Simulated`
- **Alert:** `Open` · `Acknowledged` · `Resolved` · `Suppressed`
- **Incident:** `Detected` · `Triaged` · `Assigned` · `Investigating` · `Resolved` · `Closed`
- **Work order:** `Draft` · `Open` · `Assigned` · `In Progress` · `Ready for Review` · `Blocked` · `Completed` · `Cancelled`
- **Simulator:** `Idle` · `Starting` · `Running` · `Paused` · `Stopping` · `Completed` · `Failed` · `Simulator Offline`
- **Severity:** `Informational` · `Low` · `Warning` · `High` · `Critical`

Badges may use Title Case for status tokens; headings/buttons use sentence case.

### 24.4 Naming

Pages = nouns (`Assets`, `Incidents`, `Work Orders`, `Analytics`). Actions = verbs (`Create asset`, `Assign technician`, `Acknowledge alert`, `Resolve incident`, `Start simulation`). Singular in forms, plural in collections.

### 24.5 Microcopy patterns

- **Empty:** what / why / next — "**No assets yet** — Add an asset to begin monitoring this site." · "**No incidents found** — Try changing the filters or date range." · "**No telemetry available** — This asset has not received usable measurements for the selected period." · "**No notifications** — You're up to date."
- **Loading:** "Loading asset details…" · "Retrieving telemetry…" · "Connecting to the simulator…"
- **Error:** what failed / what was saved / what to do — "We couldn't save the sensor configuration. Your previous settings are unchanged. Try again." · "Telemetry is temporarily unavailable. The last received measurement was at 10:42 UTC." · "You don't have permission to assign this work order. Contact an organization administrator."
- **Success:** "Asset created." · "Technician assigned to work order WO-1042." · "Incident marked as resolved." (not "Done!")

### 24.6 AI language

"The model detected an anomaly" (not "the system knows it's failing") · "Elevated risk estimate" (not "failure is certain") · state the horizon · uncalibrated = "Model score" · contributing features are model explanations, not confirmed root causes · "Insufficient data for a reliable assessment" · model unavailable ≠ low risk.

### 24.7 Numbers, dates, units

Locale-aware formatter; units always; meaningful precision; timezone identified; em dash "—" only with explanation/tooltip; **never zero for missing**; percentages state denominator.

### 24.8 ID formats

`GEN-01` / `Generator-01` (asset), `ALT-000123` (alert), `INC-000045` (incident), `WO-000078` (work order) — rendered in mono.

---

## 25. Localization & RTL

English first; Arabic-ready.

- Store enum values separately from localized labels; never concatenate translated fragments; allow 30–40% label expansion.
- Use logical CSS (`margin-inline`, `padding-inline`, `inset-inline-start`, `text-align: start`) — Tailwind `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`.
- `dir="rtl"` at document/component boundary; `dir="auto"` for mixed user content; isolate LTR for IDs, emails, URLs, code, measurements.
- RTL: sidebar moves right; mirror directional affordances; **don't mirror** logo, non-directional icons, charts, numeric axes, time sequences.
- Arabic: IBM Plex Sans Arabic; multi-line line-height 1.65–1.8.

---

## 26. Figma handoff conventions

- File `GridAware — Product Design`; pages: `00 Cover & Index`, `01 Foundations`, `02 Design Tokens`, `03 Components`, `04 Patterns`, `05 Application Shell`, `06 Authentication & Onboarding`, `07 Dashboard`, `08 Infrastructure`, `09 Monitoring`, `10 Intelligence`, `11 Alerts & Incidents`, `12 Maintenance & Work Orders`, `13 Analytics`, `14 Administration`, `15 Simulator Experience`, `16 Responsive Designs`, `17 Interactive Prototype`, `18 Archive (Deprecated)`.
- Frame names: `[Area] / [Screen] / [Viewport] / [State]` — e.g. `Monitoring / Asset Telemetry / Desktop / Stale Data`.
- Components: `Button / Variant=Primary / Size=Medium / State=Default`, `StatusBadge / Status=Stale`, `MetricCard / Trend=Up / State=Available`, `Sidebar / Mode=Collapsed`. Variants over duplicates.
- Text styles: `Typography/Display/XL`, `Display/LG`, `Heading/Page|Section|Subsection|Card`, `Body/Large|Default|Small`, `Label/Default`, `Caption/Default`, `Overline/Default`, `Metric/XL|LG|MD|SM`, `Data/Table|Chart Axis|Chart Legend`, `Technical/Identifier`. Color stays a separate token.
- Spacing variables `Spacing / 0…30`; aliases `Layout / Page Padding / Desktop|Tablet|Mobile`, `Layout / Grid Gap / …`, `Component / Card Padding / Default|Compact`.
- Layout grids: desktop 12 col / 24 gutter / 32 margin; tablet 8 / 20 / 24; mobile 4 / 12–16 / 16.
- Per screen: desktop, tablet, mobile (or note), default, empty, loading, error, permission, stale/offline/partial, realistic populated.
- Status labels: `Exploration`, `Draft`, `In Review`, `Approved`, `Implemented`, `Deprecated` (never "Implemented" just because handed off).
- Prototype flows: login → org → dashboard; dashboard → site → asset; asset → monitoring → chart inspection; alert → incident → assignment; work order → technician update → completion; simulator → scenario → start → pause/resume → stop. Include ≥1 error state per high-risk flow.
- Version releases (`GridAware Design v0.2`); archive, don't delete.
- Design QA: designer vs frame → engineer behavior/tokens → QA states & a11y → PO workflow/terminology → log defects → retest.

---

## 27. Acceptance criteria & defect classification

### 27.1 Must-pass checklist (condensed)

- [ ] Six EVARAX HEX exact; neutrals labeled derived; status colors separate from brand.
- [ ] Healthy, warning, critical, offline, unknown, stale, informational distinguishable without color.
- [ ] Every measurement has metric + unit; latest value always has freshness; observed vs ingestion time where relevant; timezone clear.
- [ ] Never-received ≠ stale; paused ≠ offline; stale/offline/unknown never healthy; missing not interpolated.
- [ ] Thresholds & markers labeled; tooltips show timestamp, value, unit, quality, source; series not yellow-hue-only.
- [ ] Simulated data labeled everywhere (incl. screenshots/prototype data).
- [ ] Active org visible; switching clears tenant state; breadcrumbs accurate; hidden ≠ secure.
- [ ] Alerts, incidents, work orders separate; asset is canonical context.
- [ ] Role behaviors correct (Viewer no enabled writes; Technician minimal; disabled controls explain why).
- [ ] Forms: field + form errors, duplicate-submit prevention, pending states, input preserved, unsaved-change guard, destructive confirmations.
- [ ] Incident controls expose only valid transitions; work-order review role-aware.
- [ ] Keyboard completes every P0 flow; focus visible/ordered; dialogs manage focus; reduced motion; touch targets.
- [ ] No horizontal overflow; tables/charts transform; technician completion usable on mobile; long names don't break layout.
- [ ] Tokens in a single implementation source; no arbitrary one-off colors/spacing.
- [ ] No P1/P2 features shown as available.

### 27.2 Defect severity

| Severity     | Examples                                                                                                                          | Rule                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Blocker**  | Cross-tenant data appears; critical action available to unauthorized role; stale data shown healthy; simulator data shown as real | Fix before sign-off                        |
| **Critical** | Core P0 journey can't complete; data loss on form error; misleading alert/incident/work-order relationship                        | Fix before feature/pilot                   |
| **Major**    | Responsive layout blocks task; required state missing; important info hidden                                                      | Fix before sign-off or approved mitigation |
| **Minor**    | Cosmetic alignment/spacing/typography (non-a11y)                                                                                  | May be tracked                             |

Security, tenant-isolation, data-freshness, misleading-status issues can **never** be waived as cosmetic.

---

## 28. Asset file map

```text
brand/
├── README.md
├── source/            # outlined vector masters (see §2.2)
├── digital/
│   ├── png/           # 1024/1200px transparent renders of every master
│   ├── variants/      # black/white/mono-f4e952/mono-f6fa45/mono-fcce35/square/favicon/app-icon (SVG + 512/1024 PNG; horizontal 1200, stacked 1024)
│   └── web-icons/     # favicon.ico, favicon.svg, favicon-16/32/48.png, apple-touch-icon.png,
│                      # icon-192.png, icon-512.png, maskable-512.png, gridaware-app-icon.svg,
│                      # site.webmanifest, head-snippet.html  → copy to client/public/
├── system/            # construction grid, pattern-dark/light, shell-preview (SVG + PNG)
├── presentation/      # presentation.html, preview-final.html, presentation-spec.json, slides/slide-01…05.png
└── concepts/          # archived Round 1 explorations (do not use in product)
```

SVG hex usage in masters: frame `#FFFFFF` (dark) / `#080808` (ink/light), node `#F4E952`, tile `#080808` or `#F4E952`. Inline SVG in React: import the file (or copy paths) — keep `role="img"` + `<title>`/`aria-label`.

---

## 29. Open decisions

Record resolutions in `docs/design/design-acceptance-criteria.md` before high-fidelity sign-off.

1. **Typography approval** — confirm Geist Sans/Mono (this file's default) vs Space Grotesk + Inter + IBM Plex Mono (`typography-system.md`).
2. Final sidebar width validation (248 vs 256) with real labels; tablet sidebar behavior; desktop default expanded vs compact.
3. Mobile navigation: bottom bar vs drawer.
4. Card padding final value (20 vs 24).
5. Compact density as user preference vs page-specific.
6. 1600px max width for all analytics/monitoring.
7. Simulator full-width workspace; advanced simulator config on mobile; customer demo vs internal-only exposure.
8. Sticky bottom action area for technician mobile actions.
9. Light theme: deferred for MVP? (assumed dark-only).
10. Single primary CTA accent (recommended Soft Yellow; Lime for active/focus).
11. Final semantic status colors, chart series palette, neutral scale after contrast + color-blind testing.
12. Self-registration vs invitation-only; Technician nav scope; Buildings as top-level vs contextual; alert auto-incident policy; `/app/my-work` page vs dashboard tab; URL vs local filter state; global search MVP scope; alert detail page vs drawer; site detail tabs vs summary; asset table column customization.

---

## 30. Source index

| Topic                          | Source                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Design docs index & guardrails | `docs/design/README.md`                                                                                                                       |
| Brand identity / logo rules    | `docs/design/brand-identity-guidelines.md`, `docs/design/brand-logo-brief.md`, `brand/README.md`, `brand/presentation/presentation-spec.json` |
| Color                          | `docs/design/brand-color-foundation.md`, `docs/design/design-system.md` §3–6                                                                  |
| Typography                     | `docs/design/typography-system.md`, `docs/design/design-system.md` §7                                                                         |
| Spacing & layout               | `docs/design/GridAware_Spacing_and_Layout_System.md`, `docs/design/design-system.md` §8–9                                                     |
| Shell                          | `docs/design/application-shell-specification.md`                                                                                              |
| IA / sitemap                   | `docs/design/information-architecture.md`, `docs/design/sitemap.md`                                                                           |
| Screens / wireframes           | `docs/design/screen-inventory.md`, `docs/design/wireframe-specifications.md`                                                                  |
| Flows                          | `docs/design/user-flows.md`                                                                                                                   |
| Components                     | `docs/design/component-catalog.md`                                                                                                            |
| Interaction                    | `docs/design/interaction-specifications.md`                                                                                                   |
| Data viz                       | `docs/design/data-visualization-guidelines.md`                                                                                                |
| Alerts                         | `docs/design/alert-notification-ux.md`                                                                                                        |
| Simulator                      | `docs/design/simulation-experience.md`                                                                                                        |
| Responsive                     | `docs/design/responsive-design-guidelines.md`                                                                                                 |
| Accessibility                  | `docs/design/accessibility-specification.md`                                                                                                  |
| Content                        | `docs/design/content-design-and-terminology.md`                                                                                               |
| Figma / acceptance             | `docs/design/figma-handoff-guidelines.md`, `docs/design/design-acceptance-criteria.md`                                                        |
| Personas / permissions         | `docs/product/target-users.md`                                                                                                                |
| Repo structure                 | `docs/superpowers/specs/2026-11-26-monorepo-arch-design.md`                                                                                   |
| API / events (non-visual)      | `docs/architecture/**`, `docs/contracts/**` (`openapi.yaml`, `asyncapi.yaml`)                                                                 |

> **Change control:** a design change that alters product behavior/scope must (1) identify the affected PRD requirement, (2) record change + reason, (3) review access/data/workflow consequences, (4) update `docs/design/**` and this file, (5) get product-owner approval before implementation.
