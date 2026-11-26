# GridAware — Logo & Brand Identity Design Brief

**Document version:** 1.1  
**Status:** Approved — Direction A (*Node G*) selected at Round 1 Checkpoint; full identity specified in `brand-identity-guidelines.md`  
**Product baseline:** GridAware PRD v1.1 & Design System v1.0  
**Brand palette baseline:** EVARAX (`#F4E952`, `#F6FA45`, `#FCCE35`, `#080808`, `#E9ECF2`, `#FFFFFF`)

---

## 1. Design Brief

- **Brand Name:** **GridAware** (exact CamelCase spelling; compound of *Grid* + *Aware*)
- **Summary:** GridAware is a multi-tenant B2B SaaS platform for factories and commercial buildings that connects physical infrastructure registries (sites, buildings, generators, HVAC, pumps, electrical panels), live and historical sensor telemetry, threshold/anomaly detection, and traceable incident-to-work-order execution in one system.
- **Primary Audience:** Facility Managers, Maintenance Engineers, Organization Owners / Operations Directors, Field Technicians, and read-only operational stakeholders.
- **Secondary Audience:** Technical evaluators, reliability engineers, and software reviewers encountering GridAware across the Next.js dark-first web app, documentation, GitHub `README.md`, and operational reports.
- **Brand Adjectives:** **Precise · Structured · Vigilant · Calm · Traceable**
- **Avoid Feeling:** **Alarmist · Gaming-neon · Magical/Black-box AI · Cluttered SCADA · Clip-art Industrial**
- **Promise / Big Idea:** *Turning infrastructure telemetry into actionable operational intelligence — spotting the one condition that needs attention across the grid and carrying it through to documented resolution.*

## 2. Category Research & Guardrails

### Category Conventions Observed (1,432-Logo Reference Audit)
- **Color bias:** In `testing-monitoring` (89 marks) and `cloud-infrastructure` (97 marks), blue dominates (~27–33%), followed by multi-hue, red, and green; **yellow is 0% in monitoring**. GridAware's approved EVARAX Soft Yellow (`#F4E952`) + Near Black (`#080808`) immediately owns high-contrast industrial territory without blending into blue SaaS camouflage.
- **Off-limits clichés:**
  1. Mechanical clip-art (gears, wrenches, cogs, factory smokestacks, hardhats).
  2. Medical ECG heartbeat zigzags inside circles (`codebeat`).
  3. Concentric Wi-Fi / broadcast ping rings (`onesignal`, `statuspage`, `sensu`).
  4. Generic isometric hexagons / wireframe cubes (~10% of dev/cloud logos).
  5. AI four-point sparkles or neural brain meshes (contradicts GridAware's human-in-the-loop, traceable positioning).
  6. Surveillance/CCTV human-eye literalism or sniper crosshairs.

### Application & Technical Constraints
- **Shell dimensions (`design-system.md` §8.2):** Must work as a horizontal lockup inside the `248px` expanded sidebar and as a standalone symbol inside the `72px` collapsed sidebar rail (`24–32px` icon slot), `16px` browser favicon, mobile PWA/touch icons, light PDF maintenance reports, and GitHub hero banners.
- **Localization readiness (`content-design-and-terminology.md` §10):** Must remain un-mirrored and balanced in future RTL (Arabic) layouts.
- **Color discipline:** Designed and evaluated in solid monochrome first (Round 1 checkpoint rule) so silhouette, negative space, and small-size legibility stand on pure geometry before applying the EVARAX palette in Phase 7.

### Explicit Assumptions (Open to Adjustment at Checkpoint)
1. **Exact casing in wordmark:** `GridAware` (matching `README.md`, `PRD.md`, and `content-design-and-terminology.md` §5) rather than all-caps `GRID AWARE`.
2. **Combination system:** Primary system pairs a near-square standalone symbol (`1:1` canvas) with a custom-outlined horizontal `GridAware` logotype so the collapsed `72px` rail and `16px` favicon share unmistakable DNA with the full header lockup.
3. **Typography alignment:** Wordmark pairs **Unbounded Custom** (SIL OFL avant-garde wide display grotesque with sculptural ink-traps, bespoke optical kerning, and a custom Node-squircle `i` tittle, outlined to pure vectors) with the clean operational UI typography specified in `design-system.md` §7 (`Geist Sans` / `Inter` + `Geist Mono`).

---

## 3. Word Map & Concept Longlist

### Word Mapping
- **Grid:** matrix, bays, columns, coordinates, busbar, array, modular cells, blueprint, foundation piers, orthogonal frame.
- **Aware:** elevated node, phase shift, threshold crossing, beacon, watchtower, sentinel, focus aperture, outlier caught early.
- **Traceable Loop:** baseline → deviation → alert → incident → work order → history.

### Concept Longlist (Scored /25 on Clarity, Distinction, Simplicity, Relevance, 16px Scale)
1. **Node G (Letterform Combination) — 25/25 ★ Selected (Concept A):** A bold architectural `G` fused from a 3×3 infrastructure grid whose upper-right module detaches as an active telemetry node.
2. **Phase Shift (Abstract / Negative-Space Combination) — 24/25 ★ Selected (Concept B):** Three equal vertical infrastructure columns sliced by a rising 45° negative-space threshold trace, capturing the moment normal operation shifts into an actionable alert.
3. **Focal Grid (Pictorial / Geometric Scope Combination) — 24/25 ★ Selected (Concept C):** A circular optical lens divided by an off-center golden-ratio coordinate grid that locks onto a live circular telemetry node in the upper-right focal pocket.
4. **Beacon Pylon (Pictorial Watchtower) — 18/25 (Tested in `v1`, dropped in `v2`):** Grounded twin-pier pylon with diamond core and horizontal signal wings *(eliminated after `v1` render inspection: head + horizontal wings + twin piers produced an unintended anthropomorphic T-pose silhouette at 32px)*.
4. **Threshold Frame (Abstract Brackets) — 21/25:** Opposing inspection brackets framing a stepped trace *(dropped: multi-piece frame weakens at 16px compared to Concept B)*.
5. **Busbar Datum Wordmark — 21/25:** Wordmark with linked `G`–`A` horizontal bar *(dropped: horizontal bar cuts across `r-i-d` ascenders)*.
6. **Interlock GA (Monogram) — 19/25:** Shared-stem `GA` ligature *(dropped: tighter counters at 16px than single-letter or 3-column marks)*.
7. **Step Horizon — 20/25:** Three horizontal strata with stepped middle bar *(dropped: Concept B executes the threshold step with stronger architectural presence)*.
8. **Awakened Quadrant — 17/25:** 2×2 grid with rotated diamond *(dropped on familiarity test: resembles Material/Lucide `widgets` icon)*.
9. **Diamond Eye — 16/25:** Split chevron diamond around center dot *(dropped on familiarity test: resembles `unfold-more` UI icon)*.
10. **Orbit Arc — 16/25:** 270° ring with floating 90° arc *(dropped on library collision check: too close to `statuspage.svg`)*.
