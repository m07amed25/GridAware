# GridAware — Accessibility Specification

**Document version:** 1.0  
**Status:** Proposed product requirement for design and implementation  
**Target:** WCAG 2.2 Level AA as the accessibility design baseline  
**Related documents:** `design-system.md`, `brand-color-foundation.md`, `responsive-design-guidelines.md`, `component-catalog.md`, `interaction-specifications.md`

---

## 1. Purpose and commitment

GridAware is an operational interface used to inspect equipment status, telemetry, alerts, incidents, and maintenance work. A visual-only or mouse-only interface would exclude users and can also make critical information harder to interpret under real working conditions.

The design and implementation target is **WCAG 2.2 Level AA**. WCAG 2.2 is a W3C Recommendation and adds success criteria beyond WCAG 2.1; it is also approved as ISO/IEC 40500:2025. The target must be verified through automated checks, manual keyboard and screen-reader testing, and representative user testing. A design review alone is not proof of conformance. Reference: https://www.w3.org/TR/WCAG22/ and https://www.w3.org/press-releases/2025/wcag22-iso-pas/.

## 2. Accessibility principles

1. **Perceivable:** content and status information must have alternatives beyond color, shape, or sound.
2. **Operable:** all core functionality must work using a keyboard and supported assistive technologies.
3. **Understandable:** terminology, navigation, validation, and feedback must be predictable.
4. **Robust:** semantic HTML and accessible component behavior must work with current browsers and assistive technology.
5. **Operationally safe:** alerts must not rely on flashing, sound, or color alone; users must have enough information to judge urgency.

## 3. Color and contrast

### 3.1 EVARAX palette

The supplied colors remain exact brand inputs:

- Soft Yellow `#F4E952`
- Neon Lime `#F6FA45`
- Golden Yellow `#FCCE35`
- Near Black `#080808`
- Cool White `#E9ECF2`
- Pure White `#FFFFFF`

Do not assume every brand pair passes contrast requirements. In particular, yellow and lime on white or cool-white surfaces are not acceptable for ordinary text. Their use should be limited to carefully tested accents, fills with dark text, or non-text decoration.

### 3.2 Contrast checks

Design and verify:

- Normal text: 4.5:1 minimum contrast against adjacent background.
- Large text: 3:1 minimum.
- Essential user-interface component boundaries and graphical objects: 3:1 where the criterion applies.
- Focus indicators: sufficiently visible against adjacent colors and not obscured.

Contrast must be checked for actual text/background combinations, including hover, focus, disabled, selected, chart labels, badges, and tooltips. A palette token passing in one use does not mean all components using it pass.

### 3.3 Status must not rely on color alone

Every asset status, severity, alert state, and data-quality state must include visible text and, where helpful, a distinct icon or shape. Examples:

- `Critical` + alert icon, not red alone.
- `Device Offline` + disconnected icon, not gray alone.
- `Data Stale` + clock icon and last-seen timestamp.
- `Simulated` + simulation badge and explanatory text.

## 4. Keyboard navigation

All functionality must be operable without a mouse.

Required behavior:

- Logical tab order follows visual and task order.
- A visible focus indicator appears on every interactive control.
- Focus is not hidden behind sticky headers, drawers, or dialogs.
- `Enter` activates buttons and links; `Space` activates buttons and toggles where expected.
- Escape closes dismissible dialogs, menus, and popovers where appropriate.
- Arrow keys operate menu, tab, radio, and listbox patterns according to their expected semantics.
- Data tables do not create an unusable keyboard trap.
- Global navigation, organization switcher, date pickers, chart controls, filters, and simulator controls are keyboard accessible.

Avoid custom interactive divs. Prefer semantic `button`, `a`, `input`, `select`, `table`, `nav`, `main`, `header`, and `form` elements.

## 5. Screen reader and semantic structure

- Each page has one clear primary heading (`h1`).
- Headings follow a logical hierarchy.
- Regions use descriptive landmarks: `header`, `nav`, `main`, and complementary/aside where appropriate.
- Buttons have accessible names that describe their action.
- Icon-only buttons include an accessible label and tooltip where useful.
- Form fields have visible labels and programmatically associated hints/errors.
- Tables use correct header associations.
- Status changes use restrained live-region announcements; do not announce every high-frequency telemetry point.
- Decorative icons are hidden from assistive technology; informative icons have text alternatives or are accompanied by text.

## 6. Forms and validation

Every form must provide:

- Persistent labels (not placeholder-only labels).
- Clear required/optional indications.
- Input format guidance before submission when needed.
- Inline errors associated with the relevant field.
- An error summary for forms with multiple errors where appropriate.
- Preservation of valid input after a failed submission.
- Confirmation before irreversible or high-impact actions.
- A success message that explains what happened and what the user can do next.

Do not communicate an error only by changing a field border to red. Include an error message and, where useful, an icon.

## 7. Tables, charts, and telemetry

### Tables

- Provide a meaningful caption or accessible name.
- Use proper column headers and scope.
- Keep row actions labeled and keyboard reachable.
- Do not use color-only status cells.
- Announce sort direction accessibly.

### Charts

- Provide a meaningful title and brief text summary.
- Provide a data-table or equivalent text alternative for essential information.
- Identify axes, units, and time ranges.
- Make threshold and anomaly distinctions through labels, line styles, markers, and text—not color alone.
- Do not rely on hover to expose the only copy of a critical value.
- Ensure keyboard access to chart controls and a usable alternative to point-by-point visual interaction.

### Live updates

High-frequency telemetry should not continuously trigger screen-reader announcements. Provide a user-controlled summary cadence or announce only meaningful events (e.g., device disconnected, new critical alert, incident assigned). Users must be able to pause or mute nonessential live announcements without stopping data collection.

## 8. Motion, animation, and flashing

- Respect `prefers-reduced-motion`.
- Avoid auto-scrolling dashboards.
- Avoid flashing effects for critical alerts.
- Use subtle transitions and provide non-animated alternatives.
- Do not make the interface dependent on animation to explain state.
- Live chart updates should not cause repeated visual jumps or focus movement.

## 9. Touch targets and mobile accessibility

- Target at least 44 × 44 CSS px for frequent touch actions as a GridAware design standard.
- Ensure controls do not overlap when zoomed.
- Avoid gesture-only controls; provide visible buttons.
- Support reflow at 320 CSS px where content permits, without losing essential functionality.
- Keep sticky action bars clear of browser controls and the on-screen keyboard.

## 10. Authentication and security experience

- Authentication flows must support password managers and paste where applicable.
- Avoid cognitive-function tests as the only authentication method.
- Explain session expiration and provide a recoverable re-authentication path.
- Do not discard unsaved work when a session expires without warning and recovery where feasible.
- Make permission-denied states understandable without revealing sensitive resource existence to unauthorized users.

## 11. Accessibility testing plan

### Automated checks

Use automated tooling (e.g., axe-based checks) in development and CI. Automated checks are a starting point and do not prove WCAG conformance.

### Manual checks

- Keyboard-only pass for every core workflow.
- Screen-reader pass for navigation, forms, dialogs, tables, alert updates, and charts.
- Zoom/reflow test at 200% and relevant viewport widths.
- Contrast audit across semantic states.
- Reduced-motion test.
- Touch target review on real devices or device emulation.

### Core workflow test set

1. Sign in and switch organization.
2. Navigate to a site and open an asset.
3. Inspect current and historical telemetry.
4. Review an anomaly and open its incident.
5. Assign a work order.
6. Complete a technician update.
7. Operate the simulator (start, pause, stop) in demo mode.

## 12. Acceptance criteria

- [ ] WCAG 2.2 AA is the design and implementation target.
- [ ] Every core function is keyboard operable.
- [ ] Focus indicators are visible and not obscured.
- [ ] Text and non-text contrast are verified for actual component combinations.
- [ ] Color is not the sole method of communicating status.
- [ ] Forms expose labels, hints, errors, and status to assistive technology.
- [ ] Charts provide text summaries or equivalent data access.
- [ ] Live updates avoid excessive announcements.
- [ ] Reduced-motion preferences are respected.
- [ ] Manual keyboard and screen-reader reviews are documented.

## 13. Reference

- W3C, Web Content Accessibility Guidelines (WCAG) 2.2: https://www.w3.org/TR/WCAG22/
- W3C, WCAG 2.2 approved as ISO/IEC international standard: https://www.w3.org/press-releases/2025/wcag22-iso-pas/

This document defines a target and test plan; it does not claim GridAware has already achieved conformance.
