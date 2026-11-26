# GridAware — Brand & Logo Asset Kit

Approved brand identity kit for **GridAware** (**Direction A — Node G**), built on the **EVARAX** dark-first design foundation (`#F4E952`, `#F6FA45`, `#FCCE35`, `#080808`, `#E9ECF2`, `#FFFFFF`).

Full usage rules, clear space, minimum sizes, CMYK/Pantone conversions, and UI shell integration specs live in [`docs/design/brand-identity-guidelines.md`](../docs/design/brand-identity-guidelines.md).

---

## Quick File Picker — Which File to Use Where

| Context | File to Use | Notes |
| :--- | :--- | :--- |
| **Next.js Expanded Sidebar (`248px`) / Dark Headers** | `source/gridaware-horizontal-dark.svg` | `#FFFFFF` G + wordmark, `#F4E952` live sensor node (`28px` render height) |
| **Next.js Collapsed Sidebar Rail (`72px`)** | `source/gridaware-symbol-small-dark.svg` | Pixel-hinted `16px`-grid cut in `#FFFFFF` + `#F4E952` (`28×28px` slot) |
| **Light Web Header / Light PDF Cover (Color)** | `source/gridaware-horizontal-badge-light.svg` | `#080808` badge tile preserving `#F4E952` node contrast + `#080808` wordmark |
| **Light Print / Monochrome Docs / Invoices** | `source/gridaware-horizontal-ink.svg` | Solid `#080808` Near Black one-color master |
| **Single-Color White Embossing / Dark Screenprint** | `source/gridaware-horizontal-reversed-white.svg` | Optically thinned (-4.3%) `#FFFFFF` cut to prevent halation/irradiation |
| **Splash Screen / Signage / Event Badge** | `source/gridaware-stacked-dark.svg` *(or `-ink.svg`)* | Centered vertical lockup |
| **Social Avatar / App Store / Profile Tile** | `source/gridaware-symbol-tile-dark.svg` | `#080808` rounded tile (`rx=56`) with `#FFFFFF` G + `#F4E952` node |
| **High-Visibility Merch / Sticker Accent Tile** | `source/gridaware-symbol-tile-yellow.svg` | `#F4E952` Soft Yellow tile with `#080808` Near Black symbol (`15.85:1`) |
| **Browser Favicon & PWA Icons (`apps/web/public/`)** | `digital/web-icons/*` | Copy directly to Next.js `public/` and paste `head-snippet.html` / metadata |
| **Auth / Onboarding Backdrops & Slide Covers** | `system/gridaware-pattern-dark.svg` | Derived 3×3 modular infrastructure pattern (never use behind data charts) |

---

## Directory Layout

```text
brand/
├── README.md                         # Asset picker and directory index
├── source/                           # Pure outlined vector masters (zero <text> or raster dependencies)
├── digital/
│   ├── png/                          # High-resolution transparent PNG renders (1024px / 1200px) of all masters
│   ├── variants/                     # Automated mono/black/white/square/favicon exports via export_variants.py
│   └── web-icons/                    # favicon.ico, favicon.svg, apple-touch-icon, PWA 192/512/maskable, webmanifest
├── system/                           # Construction grid, clear-space diagram, UI shell preview, and brand patterns
├── presentation/                     # Interactive HTML presentation board, spec JSON, and exported PNG slides
└── concepts/                         # Archived Round 1 monochrome exploration (Node G, Phase Shift, Focal Grid)
```
