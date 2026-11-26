# GridAware — Brand & Identity Guidelines

**Document version:** 1.0  
**Status:** Approved identity system (Direction A — *Node G*)  
**Design language:** EVARAX · Dark-first industrial SaaS  
**Related specifications:** `brand-color-foundation.md`, `design-system.md`, `application-shell-specification.md`, `content-design-and-terminology.md`, `accessibility-specification.md`, `brand-logo-brief.md`

---

## 1. Brand Essence & Voice

**GridAware** turns infrastructure telemetry into actionable maintenance intelligence for organizations operating factories, commercial buildings, and critical facilities.

- **Brand Idea:** *Vigilant clarity across the grid.* Every asset sits in an ordered operational structure; when one signal drifts out of baseline, GridAware surfaces it with context, ownership, and a traceable path to resolution.
- **Brand Adjectives:** **Precise · Structured · Vigilant · Calm · Traceable**
- **Editorial Voice (`content-design-and-terminology.md`):** Calm, direct, technically accurate, and transparent about data freshness and model uncertainty. Never alarmist, exaggerated, or framed as autonomous equipment control.
- **Exact Capitalization:** Always write **GridAware** as one word in PascalCase/CamelCase (`Grid` + `Aware`). Never write `Gridware`, `Grid Aware`, `gridaware` (outside CLI/code slugs and MQTT topics), or `GRIDAWARE`.

---

## 2. The Logo — *Node G*

### 2.1 Concept Rationale
The **Node G** mark fuses seven cells of a **3×3 modular grid** into an architectural **`G`** (**Grid** — sites, buildings, and equipment bays), while the upper-right cell detaches cleanly across orthogonal channels as an active **telemetry node** (**Aware** — the single monitored asset requiring attention).

In color on dark surfaces, the `G` structural frame and custom `GridAware` logotype stand in **Pure White (`#FFFFFF`)** while only the detached sensor node carries **EVARAX Soft Yellow (`#F4E952`)**—honoring the EVARAX principle of restrained, high-signal accent usage.

### 2.2 Master Lockup Suite
All master files live in `brand/source/` as pure outlined vector paths (zero `<text>` tags, filters, masks, or raster dependencies):

| Variant | Primary Use | Dark-Surface Master | Light-Surface Master |
| :--- | :--- | :--- | :--- |
| **Horizontal Lockup** | `248px` app sidebar, web headers, README, reports | `gridaware-horizontal-dark.svg` | `gridaware-horizontal-badge-light.svg` *(color)* · `gridaware-horizontal-ink.svg` *(1-color)* |
| **Stacked Lockup** | Splash screens, facility signage, event badges, covers | `gridaware-stacked-dark.svg` | `gridaware-stacked-ink.svg` |
| **Standalone Symbol** | Social avatars, documentation callouts, stickers | `gridaware-symbol-dark.svg` | `gridaware-symbol-ink.svg` |
| **Small-Size Cut (`≤ 32px`)** | `72px` collapsed sidebar rail (`28px` slot), `16px` favicons | `gridaware-symbol-small-dark.svg` | `gridaware-symbol-small.svg` |
| **Contained App Tile** | iOS/Android/PWA icons, light/dark browser tabs | `gridaware-symbol-tile-dark.svg` | `gridaware-symbol-tile-yellow.svg` *(accent badge)* |
| **Thinned Reversed White** | Single-color white embossing, screen print, dark overlays | `gridaware-horizontal-reversed-white.svg` · `gridaware-symbol-reversed-white.svg` | — |
| **Wordmark Only** | Co-branded footers or contexts where symbol is adjacent | `gridaware-wordmark-white.svg` | `gridaware-wordmark-ink.svg` |

---

## 3. Geometric Construction & Optical Calibration

Reference diagram: `brand/system/gridaware-construction-grid.svg` (`gridaware-construction-grid.png`).

- **Canvas & Footprint:** Built on an integer `256 × 256` grid (`x ∈ [24, 232]`, `y ∈ [23, 231]`, nudged `-1` unit vertically to sit on the optical center).
- **Optical Stroke Balancing:** Vertical stems measure `46` units (`x = 24..70`, `x = 186..232`); horizontal bars are thinned by ~9–13% (`top = 42u`, `crossbar = 40u`, `bottom = 42u`) to counteract horizontal visual heaviness and open the upper (`43u`) and lower (`41u`) interior counters evenly.
- **Same-Size Node Compensation:** The isolated upper-right sensor node is optically enlarged to `48 × 48` units (`x = 184..232`, `y = 23..71`) so its visual mass equals the `46u` continuous stems.
- **Corner Hierarchy:** Outer silhouette corners use `R = 20u`; interior counter turns use `R = 10u`; cut terminals use `R = 8u`.
- **16 px Pixel-Grid Hinting (`gridaware-symbol-small*.svg`):** For sizes `≤ 32px`, edges snap to exact `16`-unit (`1.0 px` at `16×16`) multiples (`16, 64, 80, 112, 144, 160, 176, 192, 240`), eliminating half-pixel anti-aliasing blur in browser tabs and collapsed navigation rails.
- **Anti-Irradiation Reversed Cut (`*-reversed-white.svg`):** Pure white-on-black one-color masters have strokes thinned by ~4.3% (`46u → 44u` stems, `42u → 40u` bars) so white marks on dark surfaces do not bloom heavier than black marks on paper.

---

## 4. Clear Space & Minimum Sizes

### 4.1 Clear Space (`1 × N`)
Maintain a minimum clear-space zone of **`1 × N`** on all four sides of any GridAware mark, where **`N`** equals the **width of the detached live sensor node** in that mark. No text, borders, status badges, or neighboring logos may enter this zone.
- *Exception:* Inside the `64px`-high application shell header (`application-shell-specification.md`), vertical padding may compress to `0.6 × N` (`16–18px`) provided horizontal separation from the sidebar border and collapse toggle remains `≥ 1 × N`.

### 4.2 Minimum Sizes

| Lockup / Cut | Minimum Screen Size | Minimum Print Size | Notes |
| :--- | :--- | :--- | :--- |
| **Horizontal Lockup** | `112 px` wide (`28 px` tall) | `28 mm` wide | Below `112 px` wide, switch to Standalone Symbol |
| **Stacked Lockup** | `96 px` wide | `24 mm` wide | Never use in narrow horizontal navbars |
| **Symbol (Standard Cut)** | `32 × 32 px` | `8 × 8 mm` | Use above `32 px` |
| **Symbol (Small Cut)** | `16 × 16 px` | `5 × 5 mm` | Mandatory for `16–32 px` favicons and `72px` rail |
| **Wordmark Only** | `88 px` wide | `22 mm` wide | Never add artificial tracking |

---

## 5. EVARAX Color System & Reproduction

All six **EVARAX** source HEX values are immutable (`brand-color-foundation.md`). CMYK and Pantone equivalents below are production approximations—always verify physical drawdowns before offset, signage, or garment runs.

### 5.1 Brand Palette Specifications

| Swatch Name | Token | HEX | RGB | CMYK *(approx.)* | Pantone *(approx.)* | Contrast on `#080808` | Brand Role |
| :--- | :--- | :--- | :--- | :--- | :--- | ---: | :--- |
| **Soft Yellow** | `--color-yellow` | `#F4E952` | `244, 233, 82` | `4, 0, 76, 0` | `PMS 3945 C` | `15.85 : 1` | Primary brand accent, live logo node, primary CTA fill |
| **Neon Lime** | `--color-lime` | `#F6FA45` | `246, 250, 69` | `6, 0, 83, 0` | `PMS 388 C` | `17.81 : 1` | Secondary active/focus ring, sparse pattern highlight |
| **Golden Yellow** | `--color-gold` | `#FCCE35` | `252, 206, 53` | `0, 18, 86, 0` | `PMS 115 C` | `13.37 : 1` | Warm tertiary accent, `SIMULATED` context badge accent |
| **Near Black** | `--color-black` | `#080808` | `8, 8, 8` | `72, 66, 65, 92` | `PMS Black 6 C` | — | Primary dark canvas, icon tile, light-mode ink |
| **Cool White** | `--color-off-white` | `#E9ECF2` | `233, 236, 242` | `6, 3, 1, 0` | `PMS Cool Gray 1 C` | `16.92 : 1` | Primary UI body text, light pattern canvas |
| **Pure White** | `--color-white` | `#FFFFFF` | `255, 255, 255` | `0, 0, 0, 0` | `Paper / Opaque White` | `20.03 : 1` | Dark-mode logo `G` & wordmark, maximum emphasis |

### 5.2 Approved Logo / Background Pairings
1. **On Near Black (`#080808`) or Dark UI Surfaces (`#101010`, `#171717`) — DEFAULT:** Use `gridaware-horizontal-dark.svg` or `gridaware-symbol-dark.svg` (`#FFFFFF` frame/type + `#F4E952` node).
2. **On Pure White (`#FFFFFF`) or Cool White (`#E9ECF2`):**
   - *Full-color option:* Use `gridaware-horizontal-badge-light.svg` (`#080808` badge tile housing `#FFFFFF` + `#F4E952` symbol, paired with `#080808` wordmark).
   - *Flat one-color option:* Use `gridaware-horizontal-ink.svg` or `gridaware-symbol-ink.svg` (solid `#080808`).
   - **CRITICAL RULE:** Never place an uncontained `#F4E952`, `#F6FA45`, or `#FCCE35` yellow/lime element directly on `#FFFFFF` or `#E9ECF2` (`1.12–1.50 : 1` contrast—fails legibility).
3. **On EVARAX Soft Yellow (`#F4E952`) Accent Surfaces:** Use solid Near Black (`#080808`, e.g., `gridaware-symbol-tile-yellow.svg` or `gridaware-horizontal-ink.svg` — `15.85 : 1` contrast).
4. **On Photographs or Complex Industrial Backgrounds:** Place `gridaware-symbol-tile-dark.svg` (contained `#080808` tile) or `gridaware-horizontal-reversed-white.svg` over a calm region with `≥ 4.5 : 1` verified contrast.
5. **Brand vs. Operational Status (`design-system.md` §5):** EVARAX Soft Yellow in the logo is a **brand identifier**, never an operational warning state. Keep UI status badges (`Operational #35C58A`, `Warning #F0B84B`, `Critical #F06A6A`, `Offline #9AA1AC`) strictly separate from brand identity marks.

---

## 6. Typography

### 6.1 Logotype Construction (*Unbounded Custom*)
The `GridAware` wordmark in `brand/source/` is custom-engineered from the open-licensed **Unbounded** display grotesque (NaN Foundry, SIL Open Font License 1.1) and converted into pure cubic Bézier outlines (`0` `<text>` elements or runtime font dependencies):
- **Distinctive Voice:** Wide architectural stance with deep sculptural ink-traps on `r`, `d`, `A`, `w`, `a`, and `e`, paired with a squared horizontal-bar `G` spur that complements **Node G** without duplicating it.
- **Bespoke Customizations:** Tightened `-0.025em` display tracking, optical pair kerning across `A–w`, `w–a`, `d–A`, and `G–r`, and a custom **Node-squircle tittle on `i`** (asymmetric `40%` top-right corner radius) echoing the symbol's detached telemetry node.
- **Optical Weight Cuts:** Primary masters use `wght = 580`; pure white reversed masters (`*-reversed-white.svg`) use an optically graded `wght = 545` cut (~6% lighter stems) to counteract white-on-black halation. Never attempt to re-type the logo in a system or web font.

### 6.2 Brand & Product Typefaces (`design-system.md` §7)
Limit all product UI, marketing, and documentation to **two open-licensed families** (SIL Open Font License 1.1—cleared for commercial, web, print, and embedded use):
1. **Primary Sans — `Geist Sans`** *(or `Inter` fallback)*:
   - *Weights:* Regular (`400`) for body copy, Medium (`500`) for navigation and labels, SemiBold (`600`) for page/card headings, Bold (`700`) sparingly for hero display.
   - *Web stack:* `'Geist Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`.
2. **Technical & Numeric Mono — `Geist Mono`** *(or `JetBrains Mono` / `Ubuntu Sans Mono` fallback)*:
   - *Use:* Telemetry values with units (`86.5 °C`, `4.2 mm/s`), tabular KPI numerals (`font-variant-numeric: tabular-nums`), asset/incident/work-order IDs (`GEN-01`, `INC-0045`, `WO-1042`), UTC timestamps, and MQTT topic paths.
   - *Web stack:* `'Geist Mono', ui-monospace, 'SFMono-Regular', Consolas, monospace`.

---

## 7. Identity System Extensions

### 7.1 Derived Architectural Pattern (`brand/system/gridaware-pattern-*.svg`)
Built directly from `Node G`'s 3×3 modular grid and `R = 8–14` corner vocabulary:
- Depicts calm `#101010` / `#141414` facility cells and L-conduits on `#080808`, punctuated sparingly (≤ 2 cells per viewport) by active `#F4E952` / `#F6FA45` sensor nodes.
- **Where to use:** Authentication/onboarding split-screen backdrops (`SC-01`, `SC-02`), presentation slide covers, social cover banners, and business-card backs.
- **Where NOT to use:** Never place behind live telemetry charts, alert queues, or dense data tables (`design-system.md` §2: *Operational clarity over decoration*).

### 7.2 Application Shell Integration (`brand/system/gridaware-shell-preview.svg`)
- **Expanded Sidebar (`248px` wide × `64px` top header):** Render `gridaware-horizontal-dark.svg` at **`28px` symbol height** (`~161px` total lockup width), left-aligned at `20px` padding (`67px` right clear margin inside the `248px` rail), vertically centered inside the `64px` header bar.
- **Collapsed Sidebar Rail (`72px` wide × `64px` top header):** Swap seamlessly to `gridaware-symbol-small-dark.svg` at **`28 × 28 px`**, centered horizontally at `x = 36px`, `y = 32px`, with an accessible label `aria-label="GridAware Dashboard"`.
- **RTL Localization (`content-design-and-terminology.md` §10):** When mirroring the application shell for Arabic or other RTL locales, move the sidebar to the right edge, but **never mirror or flip** the `Node G` symbol or `GridAware` logotype.

### 7.3 Motion Principles (`design-system.md` §13)
- **Logo Reveal (Splash / Video Sting — 1.2s max):** The `G` frame settles first (`0–500ms`, `cubic-bezier(0.22, 1, 0.36, 1)`), followed by the upper-right sensor node stepping `4px` into grid lock and illuminating in `#F4E952` (`400–850ms`), then resolving to the static master.
- **In-App Restraint:** Never continuously pulse, spin, or neon-glow the sidebar logo during normal monitoring sessions, and honor `prefers-reduced-motion: reduce` by rendering the static master immediately.

---

## 8. Logo Misuse (Don'ts)

1. **Don't recolor the live node to red/green to indicate app status** — the logo is a brand signature, not a live health widget (use `StatusBadge` / `FreshnessIndicator` components for operational status).
2. **Don't place uncontained yellow (`#F4E952` / `#F6FA45`) on white or light gray backgrounds.**
3. **Don't reattach, move, rotate, or delete the upper-right sensor node** — the orthogonal separation is the core of the mark.
4. **Don't stretch, skew, outline, or add drop shadows / neon outer glows** to the symbol or wordmark.
5. **Don't re-set `GridAware` in another typeface** or alter the symbol-to-wordmark scale/gap in approved lockups.
6. **Don't mirror the symbol** in right-to-left (RTL) layouts.

---

## 9. File Map & Governance

- **Master Vectors:** `brand/source/*.svg`
- **Screen Variants & PNGs:** `brand/digital/variants/` and `brand/digital/png/`
- **Next.js Favicon / PWA Bundle:** `brand/digital/web-icons/` (`favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable-512.png`, `site.webmanifest`, `head-snippet.html`)
- **System Diagrams & Patterns:** `brand/system/`
- **Client Presentation & Mockups:** `brand/presentation/presentation.html` (`slides/slide-01.png`–`slide-05.png`)
- **Legal & Pre-Launch Note:** Before commercial launch, complete a trademark and reverse-image clearance search in target jurisdictions (Class 9 / Class 42 SaaS & industrial monitoring), and verify Pantone/CMYK physical proofs for printed collateral.
