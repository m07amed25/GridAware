# GridAware — Typography System

**Document version:** 1.0  
**Status:** Proposed typography direction for product-owner approval  
**Product baseline:** GridAware PRD v1.0  
**Design language:** EVARAX  
**Applies to:** Marketing surfaces, authenticated web application, dashboards, tables, forms, charts, alerts, notifications, reports, documentation, and future mobile experiences.

---

## 1. Purpose

This document establishes one coherent typography system for all GridAware product surfaces. It defines font families, semantic roles, type scale, weights, line heights, letter spacing, numeric treatment, responsive behavior, accessibility rules, Figma text styles, and implementation tokens.

The goal is not to use many fonts for visual variety. The goal is to create a recognizable brand voice while keeping dense operational information easy to scan and trustworthy.

Typography must support three distinct needs:

1. **Brand expression:** confident, modern headings that give GridAware a recognizable identity.
2. **Operational readability:** highly legible interface text for long sessions and dense workflows.
3. **Technical precision:** stable alignment for telemetry values, IDs, timestamps, model versions, and code-like data.

The chosen system must work with the EVARAX palette without relying on bright colors or oversized typography to create hierarchy.

## 2. Typography Direction

### 2.1 Design characteristics

GridAware typography should feel:

- Precise, not sterile.
- Technical, not overly futuristic.
- Confident, not aggressive.
- Compact enough for operational dashboards, but never cramped.
- Neutral enough to keep equipment data more important than decorative type.

Avoid ultra-condensed fonts, sci-fi display faces, overly rounded geometric fonts, excessive italic text, and very light weights on dark surfaces.

### 2.2 Recommended font stack

Use three primary families, plus an Arabic-script companion for localization.

| Role                     | Typeface                 | Weights            | Usage                                                                                                                              |
| ------------------------ | ------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Display / brand headings | **Space Grotesk**        | 500, 600, 700      | Marketing hero, brand statements, major page titles, selected section headings                                                     |
| Product UI / body        | **Inter**                | 400, 500, 600, 700 | Navigation, body copy, forms, buttons, tables, labels, dialogs, helper text                                                        |
| Technical / data         | **IBM Plex Mono**        | 400, 500, 600      | Sensor readings, KPI values where fixed-width alignment helps, timestamps, identifiers, device codes, model versions, code samples |
| Arabic UI companion      | **IBM Plex Sans Arabic** | 400, 500, 600, 700 | Arabic interface text and fallback for Arabic glyphs in mixed-language content                                                     |

**Why this combination:** Space Grotesk contributes a distinct technical character for high-level headings. Inter is designed for screen use and includes tabular-number features, which are useful in interfaces. IBM Plex Mono gives technical values a consistent fixed-width treatment. IBM Plex includes Arabic-script support through IBM Plex Sans Arabic, which gives the product a documented path to RTL localization. [Inter type description](https://github.com/google/fonts/blob/main/ofl/inter/DESCRIPTION.en_us.html) · [Space Grotesk type description](https://github.com/google/fonts/blob/main/ofl/spacegrotesk/DESCRIPTION.en_us.html) · [IBM Plex typeface and language support](https://www.ibm.com/design/language/typography/typeface/) · [IBM Plex source packages](https://github.com/IBM/plex/).

### 2.3 Typeface restrictions

- Do not introduce a fourth Latin typeface for ordinary product UI.
- Do not use Space Grotesk for long paragraphs, dense table content, form controls, or small metadata.
- Do not use IBM Plex Mono for paragraphs or long labels.
- Do not use font weight alone to communicate severity or status.
- Do not use the display font for every heading. Reserve it for the top of the hierarchy.
- The final GridAware logo wordmark may use custom lettering or adjusted typography. The UI type stack does not dictate the final logo construction.

## 3. Typeface Roles by Product Surface

| Product surface                  | Primary family       | Secondary family                | Notes                                                                               |
| -------------------------------- | -------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| Marketing / product landing page | Space Grotesk        | Inter                           | Use expressive headings and readable explanatory copy                               |
| Authenticated application        | Inter                | Space Grotesk                   | Inter is the operational workhorse; Space Grotesk is reserved for page-level titles |
| Dashboard KPI values             | IBM Plex Mono        | Inter                           | Prefer tabular figures; use Inter if a value becomes too wide                       |
| Telemetry charts                 | Inter                | IBM Plex Mono                   | Inter for axes/legends; mono for exact values in tooltips and readouts              |
| Data tables                      | Inter                | IBM Plex Mono                   | Inter for labels and descriptions; mono for IDs and precise measurements            |
| Forms and settings               | Inter                | IBM Plex Mono                   | Mono only for API keys, device IDs, and technical identifiers                       |
| Alerts and notifications         | Inter                | IBM Plex Mono                   | Clear labels and descriptions; mono for event IDs and timestamps                    |
| Reports / exports                | Inter                | IBM Plex Mono                   | Preserve readable text and stable numeric alignment                                 |
| Technical documentation          | Inter                | IBM Plex Mono                   | Space Grotesk can be used for document-level cover headings                         |
| Arabic locale                    | IBM Plex Sans Arabic | IBM Plex Mono where appropriate | Enable RTL layout and Arabic-aware font fallback                                    |

## 4. Type Scale

Use a deliberately small set of semantic sizes. Figma styles and code tokens must share the same names.

### 4.1 Core scale

| Token              |  Size | Line height | Default weight | Intended use                                                        |
| ------------------ | ----: | ----------: | -------------: | ------------------------------------------------------------------- |
| `display-xl`       | 48 px |       56 px |            600 | Marketing hero or major brand statement; rarely used inside the app |
| `display-lg`       | 40 px |       48 px |            600 | Landing-page headline or major product announcement                 |
| `page-title`       | 28 px |       36 px |            600 | Main authenticated page title                                       |
| `section-title`    | 22 px |       30 px |            600 | Major page section heading                                          |
| `subsection-title` | 18 px |       26 px |            600 | Card group / subsection heading                                     |
| `card-title`       | 16 px |       24 px |            600 | Card and panel title                                                |
| `body-lg`          | 16 px |       24 px |            400 | Introductory copy and important explanatory text                    |
| `body`             | 14 px |       21 px |            400 | Default interface and paragraph text                                |
| `body-sm`          | 13 px |       19 px |            400 | Dense table rows and secondary UI copy                              |
| `label`            | 13 px |       18 px |            500 | Form labels, navigation labels, field headings                      |
| `caption`          | 12 px |       16 px |            400 | Supporting metadata and timestamps                                  |
| `overline`         | 11 px |       14 px |            600 | Short uppercase group labels only                                   |

### 4.2 Operational data scale

| Token          |  Size | Line height | Weight | Intended use                     |
| -------------- | ----: | ----------: | -----: | -------------------------------- |
| `metric-xl`    | 36 px |       44 px |    600 | Primary KPI value                |
| `metric-lg`    | 28 px |       36 px |    600 | Asset detail measurement         |
| `metric-md`    | 22 px |       28 px |    600 | Compact metric card              |
| `metric-sm`    | 16 px |       22 px |    600 | Inline operational measurement   |
| `metric-unit`  | 12 px |       16 px |    500 | Unit beside a measurement        |
| `chart-axis`   | 11 px |       14 px |    400 | Chart axis labels                |
| `chart-legend` | 12 px |       16 px |    500 | Chart legend labels              |
| `table-data`   | 13 px |       18 px |    400 | Dense operational tables         |
| `technical-id` | 12 px |       18 px |    400 | Asset IDs, sensor IDs, event IDs |

The operational scale is semantic. Do not create a new size for every individual chart or card.

## 5. Weights

Use the following weights consistently:

| Weight token | Numeric weight | Use                                             |
| ------------ | -------------: | ----------------------------------------------- |
| `regular`    |            400 | Paragraphs, descriptions, normal values         |
| `medium`     |            500 | Labels, navigation, buttons, selected metadata  |
| `semibold`   |            600 | Titles, card headings, KPI values, emphasis     |
| `bold`       |            700 | Rare strong emphasis and marketing display only |

Avoid 300/light for critical UI text on dark surfaces. Avoid using 700 for every heading; it makes dense dashboards visually noisy.

## 6. Letter Spacing and Case

| Context             | Letter spacing | Case rule                       |
| ------------------- | -------------: | ------------------------------- |
| Display 40–48 px    |       -0.03 em | Sentence case                   |
| Page title 28 px    |       -0.02 em | Sentence case                   |
| Section title 22 px |      -0.015 em | Sentence case                   |
| Body text           |              0 | Natural sentence case           |
| Navigation          |              0 | Sentence case                   |
| Form labels         |              0 | Sentence case                   |
| Overline labels     |       +0.06 em | Uppercase only for short labels |
| Numeric readouts    |  0 to -0.01 em | Preserve exact digits and signs |
| IDs / codes         |              0 | Preserve source casing          |

Do not write whole sentences in uppercase. Avoid wide letter spacing on telemetry values, long labels, or body copy.

## 7. Line Length and Paragraph Rules

- Target 45–80 characters per line for explanatory text where layout allows.
- Keep help text close to its associated field.
- Use 1.4–1.5 line height for body copy.
- Use 1.15–1.3 line height for display and headings.
- Avoid long paragraphs inside dashboard cards; summarize and provide a detail view when needed.
- Do not truncate critical incident descriptions, alarm reasons, asset names, or safety-related instructions without an explicit reveal mechanism.
- When text is truncated, provide a tooltip or detail view and preserve keyboard accessibility.

## 8. Typography Rules for Specific Components

### 8.1 Application shell

| Component                      | Style                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------- |
| Product wordmark in app chrome | Space Grotesk 600, 18–20 px; final logo asset takes precedence once approved |
| Primary navigation             | Inter 500, 13 px / 20 px                                                     |
| Active navigation              | Inter 600, 13 px / 20 px                                                     |
| Breadcrumbs                    | Inter 400, 12 px / 16 px                                                     |
| Organization / site switcher   | Inter 500, 13–14 px / 20 px                                                  |
| User menu                      | Inter 500, 13 px / 20 px                                                     |

### 8.2 Dashboard

- Page heading: Space Grotesk 600, 28/36.
- Card title: Inter 600, 16/24.
- KPI value: IBM Plex Mono 600, 28/36 or 36/44 according to prominence.
- KPI label: Inter 500, 12/16.
- Comparison text: Inter 400, 12/16.
- Chart title: Inter 600, 14/20.

### 8.3 Asset details

- Asset name: Space Grotesk 600, 28/36.
- Asset type and location: Inter 400, 13/19.
- Measurement: IBM Plex Mono 600, 28/36.
- Unit: Inter 500, 12/16.
- Sensor label: Inter 500, 13/18.
- Last-updated timestamp: Inter 400, 12/16.

### 8.4 Monitoring charts

- Chart title: Inter 600, 14/20.
- Axis labels: Inter 400, 11/14.
- Legend: Inter 500, 12/16.
- Tooltip label: Inter 500, 12/16.
- Tooltip reading: IBM Plex Mono 500, 13/18.
- Threshold annotation: Inter 500, 11/14.

Never shrink axis labels so far that the unit or time interval becomes ambiguous. Reduce tick frequency before reducing font size.

### 8.5 Tables

- Table header: Inter 600, 11–12 px / 16 px.
- Standard cell: Inter 400, 13/18.
- Secondary cell: Inter 400, 12/16.
- Numeric column: IBM Plex Mono 400 or Inter with tabular figures, 12–13/18.
- Row action: Inter 500, 12–13/18.

Keep column headers in sentence case unless the table is extremely dense. Align text left and numeric values right in LTR layouts. Keep unit information in the header or adjacent to the value.

### 8.6 Forms

- Field label: Inter 500, 13/18.
- Input value: Inter 400, 14/20.
- Placeholder: Inter 400, 14/20; lower emphasis, but still readable.
- Helper text: Inter 400, 12/16.
- Validation error: Inter 500, 12/16.
- Section heading: Inter 600, 16/24.

Use a 16 px minimum input text size on mobile layouts to avoid browser auto-zoom behavior in common mobile browsers. Never use placeholder text as the only field label.

### 8.7 Buttons and controls

- Primary / secondary button: Inter 600, 14/20.
- Compact button: Inter 600, 13/18.
- Icon-only control: no visible text style; provide an accessible name.
- Tabs: Inter 500, 13/18; selected tab Inter 600.
- Select / combobox option: Inter 400, 14/20.

### 8.8 Alerts and status labels

- Alert title: Inter 600, 14/20.
- Alert description: Inter 400, 13/19.
- Status badge: Inter 600, 11–12/16.
- Incident identifier: IBM Plex Mono 400, 12/18.
- Timestamp: Inter 400, 12/16.

Status must be stated in text. Color and weight are supplementary, not the only way to communicate severity or lifecycle state.

### 8.9 Notifications

- Notification title: Inter 600, 13/19.
- Notification summary: Inter 400, 13/19.
- Timestamp: Inter 400, 11–12/16.
- Related asset / incident ID: IBM Plex Mono 400, 11–12/16.

### 8.10 Technical content

Use IBM Plex Mono for code snippets, device identifiers, event IDs, model versions, API paths, hexadecimal values, and connection diagnostics. Keep prose around code in Inter. Do not render full paragraphs in monospace.

## 9. Numeric and Measurement Typography

GridAware is a telemetry-heavy product. Numeric typography is a functional requirement, not decoration.

### 9.1 Tabular numerals

Enable tabular numerals for values that update or appear in columns so digits do not shift horizontally as values change.

```css
.numeric,
.telemetry-value,
.kpi-value,
.table-numeric {
  font-variant-numeric: lining-nums tabular-nums;
  font-feature-settings:
    "lnum" 1,
    "tnum" 1;
}
```

### 9.2 Units and precision

- Always show a unit for physical measurements when the metric requires one.
- Keep the unit visually associated with the value, but lower its emphasis.
- Define decimal precision per metric; do not let values randomly switch between 1, 2, or 4 decimal places.
- Preserve meaningful negative signs and plus signs.
- Use locale-aware formatting for dates, number separators, and decimal separators.
- Never infer or silently convert measurement units without recording the source and conversion rule.
- Avoid presenting a stale reading with the same typographic treatment as a fresh reading; pair it with an explicit freshness label.

Example:

```text
86.5 °C
4.20 mm/s
400 V
49.98 Hz
```

### 9.3 Time and identifiers

- Use a consistent date/time format within a user locale.
- Keep machine identifiers and event identifiers in IBM Plex Mono.
- Provide copy actions for long identifiers where useful.
- Do not use monospace for a human-readable asset name unless the string is a technical code.

## 10. Responsive Typography

Typography should scale deliberately, not shrink indiscriminately.

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

Rules:

- Do not reduce body copy below 14 px for ordinary app content.
- Keep input text at 16 px on mobile.
- Allow headings to wrap naturally; do not force single-line headings if that causes overflow.
- Use responsive layout changes before compressing typography.
- For narrow charts, reduce tick density and shorten date labels before shrinking labels.
- Test at 320 px, 375 px, 768 px, 1024 px, 1280 px, and 1440 px viewport widths.

## 11. Accessibility and Readability

- Typography must be paired with verified text/background contrast from the color system.
- Do not use color, weight, font style, or letter spacing as the only way to convey status.
- Body copy should remain comfortably readable at normal zoom.
- Support browser zoom to 200% without clipping or loss of functionality.
- Keep focus indicators visible and unobscured.
- Avoid long passages in all caps or italics.
- Use sentence case for navigation, buttons, form labels, and page titles.
- Avoid text baked into images; use real text for localization and assistive technologies.
- Do not use `text-transform: uppercase` on user-provided content or asset names.
- Keep line height generous for multi-line Arabic content.

The font-size values in this document are design recommendations, not a claim that a particular font size alone establishes WCAG conformance. Accessibility must be checked across contrast, zoom, reflow, keyboard operation, semantics, and assistive technology.

## 12. Arabic and RTL Readiness

The initial design baseline may launch in English, but the typography and layout should not block future Arabic localization.

- Use IBM Plex Sans Arabic for Arabic UI content.
- Use logical CSS properties (`margin-inline`, `padding-inline`, `inset-inline-start`) rather than hard-coded left/right properties wherever practical.
- Set `dir="rtl"` at the appropriate document or component boundary.
- Use `dir="auto"` for mixed user-entered content where direction is not known.
- Keep technical identifiers, email addresses, URLs, and code in LTR isolation where appropriate.
- Verify punctuation, parentheses, units, numeric sequences, and mixed Arabic/Latin text in actual browser rendering.
- Do not mirror icons that do not express direction. Mirror navigation arrows and directional affordances where the interaction direction changes.
- Give Arabic multi-line paragraphs a slightly more generous line height (recommended 1.65–1.8) after visual validation.

## 13. CSS Tokens

These tokens are the canonical implementation mapping for the type system.

```css
:root {
  /* Font families */
  --font-display: "Space Grotesk", "IBM Plex Sans Arabic", sans-serif;
  --font-sans: "Inter", "IBM Plex Sans Arabic", sans-serif;
  --font-mono: "IBM Plex Mono", "IBM Plex Sans Arabic", monospace;
  --font-arabic: "IBM Plex Sans Arabic", sans-serif;

  /* Font weights */
  --font-regular: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Type sizes */
  --text-display-xl: 3rem; /* 48px */
  --text-display-lg: 2.5rem; /* 40px */
  --text-page-title: 1.75rem; /* 28px */
  --text-section-title: 1.375rem; /* 22px */
  --text-subsection-title: 1.125rem; /* 18px */
  --text-card-title: 1rem; /* 16px */
  --text-body-lg: 1rem; /* 16px */
  --text-body: 0.875rem; /* 14px */
  --text-body-sm: 0.8125rem; /* 13px */
  --text-label: 0.8125rem; /* 13px */
  --text-caption: 0.75rem; /* 12px */
  --text-overline: 0.6875rem; /* 11px */

  /* Line heights */
  --leading-display-xl: 3.5rem; /* 56px */
  --leading-display-lg: 3rem; /* 48px */
  --leading-page-title: 2.25rem; /* 36px */
  --leading-section-title: 1.875rem; /* 30px */
  --leading-subsection-title: 1.625rem; /* 26px */
  --leading-body-lg: 1.5rem; /* 24px */
  --leading-body: 1.3125rem; /* 21px */
  --leading-body-sm: 1.1875rem; /* 19px */
  --leading-caption: 1rem; /* 16px */
  --leading-overline: 0.875rem; /* 14px */
}

[lang="ar"] {
  --font-display: "IBM Plex Sans Arabic", sans-serif;
  --font-sans: "IBM Plex Sans Arabic", sans-serif;
  --font-arabic: "IBM Plex Sans Arabic", sans-serif;
}

body {
  font-family: var(--font-sans);
  font-size: var(--text-body);
  line-height: var(--leading-body);
  font-weight: var(--font-regular);
  font-feature-settings: "kern" 1;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1,
.page-title,
.display-heading {
  font-family: var(--font-display);
  font-weight: var(--font-semibold);
  letter-spacing: -0.02em;
}

code,
pre,
.technical-value,
.technical-id {
  font-family: var(--font-mono);
  font-variant-numeric: lining-nums tabular-nums;
}
```

## 14. Next.js Font Loading Example

Use `next/font` to self-host and optimize font delivery rather than relying on runtime requests to an external font stylesheet. Keep only the weights and subsets actually needed by the application.

```tsx
// apps/web/src/app/fonts.ts
import { Inter } from "next/font/google";
import { Space_Grotesk } from "next/font/google";
import { IBM_Plex_Mono } from "next/font/google";
import { IBM_Plex_Sans_Arabic } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans-arabic",
  display: "swap",
});
```

The application root should expose the variables on the document element or body, then map the semantic CSS tokens to these generated variables. Confirm the exact font-loader options against the installed Next.js version before implementation.

## 15. Figma Text Style Naming

Create Figma text styles using the following naming convention:

```text
Typography/
├── Display/XL
├── Display/LG
├── Heading/Page
├── Heading/Section
├── Heading/Subsection
├── Heading/Card
├── Body/Large
├── Body/Default
├── Body/Small
├── Label/Default
├── Caption/Default
├── Overline/Default
├── Metric/XL
├── Metric/LG
├── Metric/MD
├── Metric/SM
├── Data/Table
├── Data/Chart Axis
├── Data/Chart Legend
└── Technical/Identifier
```

For every style, define family, weight, size, line height, letter spacing, and text color as separate properties. Color remains a color token and must not be hard-coded into the text style when a reusable semantic text color exists.

## 16. Design QA Checklist

Before approving a screen, verify:

- [ ] Correct family is used for the role.
- [ ] Text style token is used instead of ad hoc values.
- [ ] Weight communicates hierarchy without excessive bolding.
- [ ] Line height is appropriate for the text size and script.
- [ ] Page title, section, card, and body levels are visually distinct.
- [ ] Table numbers align consistently.
- [ ] Telemetry values include units and appropriate precision.
- [ ] Long asset names and incident descriptions remain readable.
- [ ] Small text remains legible on the selected dark surface.
- [ ] Responsive layouts do not solve overflow by shrinking text excessively.
- [ ] 200% zoom does not hide content or actions.
- [ ] Arabic fallback and RTL behavior are tested if Arabic is enabled.
- [ ] Font files are subsetted and loaded efficiently.

## 17. Acceptance Criteria

The typography system is ready for high-fidelity Figma work when:

1. The product owner approves the typeface combination.
2. Every semantic text role has a Figma style.
3. The design-system document points to this specification as the source of truth.
4. Dashboard, asset detail, monitoring, incident, and work-order wireframes can all be styled without creating arbitrary font sizes.
5. Numeric and telemetry examples have been reviewed at realistic data density.
6. The English interface renders consistently across supported browsers.
7. The Arabic fallback and RTL strategy are documented, even if Arabic is not part of the initial release.

## 18. Reference Resources

- [IBM Design Language — Typeface](https://www.ibm.com/design/language/typography/typeface/)
- [IBM Plex — Official source and packages](https://github.com/IBM/plex/)
- [Inter — Google Fonts family description](https://github.com/google/fonts/blob/main/ofl/inter/DESCRIPTION.en_us.html)
- [Space Grotesk — Google Fonts family description](https://github.com/google/fonts/blob/main/ofl/spacegrotesk/DESCRIPTION.en_us.html)
- [Google Fonts — Variable font guidance](https://googlefonts.github.io/gf-guide/variable.html)

---

**Decision summary:** Space Grotesk for display headings; Inter for product UI and body; IBM Plex Mono for technical data; IBM Plex Sans Arabic for Arabic localization. This is the proposed GridAware typography standard, pending final visual approval in Figma.
