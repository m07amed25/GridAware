# GridAware — Data Visualization Guidelines

**Document version:** 1.0  
**Status:** Proposed specification for design and engineering review  
**Scope:** Telemetry, equipment health, anomalies, prediction output, operational analytics  
**Related documents:** `design-system.md`, `component-catalog.md`, `responsive-design-guidelines.md`, `accessibility-specification.md`, `interaction-specifications.md`

---

## 1. Purpose

Data visualization is a core product surface in GridAware. Users must interpret sensor measurements, detect changes, compare equipment, and investigate incidents. Charts must communicate what the data represents, its units, time range, freshness, quality, and uncertainty. A visually attractive chart that hides stale or missing data is a product defect.

This document establishes chart selection, encoding, thresholds, time handling, telemetry states, anomaly markers, prediction visualization, interactions, and responsive behavior.

## 2. Visualization principles

1. **Context before decoration:** show asset, metric, unit, time range, aggregation, and data freshness.
2. **Actual and predicted are different:** never make forecast values visually indistinguishable from observed measurements.
3. **Gaps remain gaps:** missing telemetry must not be silently interpolated as if measured.
4. **Thresholds are contextual:** show where thresholds come from and whether they are user-configured, manufacturer-specified, or provisional.
5. **Anomalies need evidence:** a marker should open the event details and supporting window, not merely decorate a line.
6. **Comparisons require common units and periods:** do not compare unlike assets or incompatible aggregations without warning.
7. **Accessible alternatives:** essential chart conclusions must be available as text or tabular data.

## 3. Required chart context

Every operational chart or chart panel must define:

| Context          | Required presentation                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| Asset            | Asset name and identifier, or clearly stated site-level scope          |
| Metric           | Human-readable metric name                                             |
| Unit             | Explicit unit (°C, mm/s, V, A, kW, bar, etc.)                          |
| Time range       | Start/end or selected window and timezone context                      |
| Data state       | Live, delayed, stale, partial, simulated, or unavailable               |
| Aggregation      | Raw, 1-minute average, 5-minute average, etc.                          |
| Threshold source | Configured threshold, reference range, or no threshold configured      |
| Last update      | Last successful ingestion time, distinct from event time when relevant |

For charts with multiple series, each series must include a metric label and unit. Do not put incompatible units on one axis unless the design clearly identifies the second axis and the comparison is justified.

## 4. Chart selection guide

| User question                               | Recommended visualization                                             | Avoid                                      |
| ------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| How has a metric changed over time?         | Line chart                                                            | Pie chart or decorative gauge              |
| Is a reading inside a configured range?     | Line chart with threshold bands/lines and explicit labels             | Color-only background                      |
| Which assets have the highest current risk? | Sorted horizontal bar chart or ranked table                           | 3D chart                                   |
| How is asset health distributed?            | Stacked bar or donut with a text legend and exact counts              | Donut without labels                       |
| How do sites compare over a period?         | Grouped/stacked bar or small multiples with same units and range      | Dual-axis comparison that obscures scale   |
| When did events occur?                      | Timeline/event markers                                                | Dense unlabelled scatter                   |
| How does actual compare with forecast?      | Line chart with forecast boundary and confidence band where available | Single continuous line without distinction |
| What happened around an incident?           | Time-series evidence window with event annotations                    | Summary score without evidence             |

## 5. Telemetry line charts

### 5.1 Required elements

- Chart title and metric name.
- Unit on the y-axis or in the title/legend.
- Time scale and timezone-aware labels.
- Selected period and aggregation.
- Last update / freshness label.
- Legend for multiple series.
- Threshold line(s) with readable labels.
- Anomaly markers and event links where available.
- Empty/loading/error/stale state handling.

### 5.2 Line semantics

- Use a continuous solid line for observed measurements when continuity is supported by the samples.
- Use a dashed or otherwise distinctly styled line for forecast output.
- Use a separate visual treatment for estimated/interpolated values and clearly label them.
- Use a gap for missing data rather than drawing a continuous bridge that implies a measurement existed.
- Do not rely solely on EVARAX yellow/lime to distinguish series; use line patterns, markers, labels, or small multiples.

### 5.3 Threshold bands

A threshold display must identify the threshold type:

- Warning threshold.
- Critical threshold.
- Operating target/range.
- Reference range.

Threshold values must not be assumed globally for all generator models or equipment types. The UI should identify the source (e.g., organization-configured rule, equipment specification, or provisional demo rule). A missing threshold must be shown as `Not configured`, not as a fabricated safe range.

## 6. Telemetry freshness and data quality

Use separate labels for operational state, connection state, and measurement freshness.

| State       | Meaning                                             | UI treatment                                                 |
| ----------- | --------------------------------------------------- | ------------------------------------------------------------ |
| Live        | Data is arriving within configured freshness window | Live label + updated timestamp                               |
| Delayed     | Data is arriving later than expected                | Delayed label and delay context                              |
| Stale       | Last reading exceeds freshness threshold            | Stale badge + last received time; stop presenting as live    |
| Partial     | Some expected metrics are missing                   | Partial data indicator and missing metric list               |
| Invalid     | Payload/value failed validation                     | Invalid record count or quality notice; don't graph as valid |
| Offline     | Device heartbeat/connection unavailable             | Offline device state, distinct from asset health             |
| Simulated   | Data originates from simulator                      | Persistent `SIMULATED` / `DEMO DATA` indicator               |
| Unavailable | No usable measurements for selected range           | Empty state and reason where known                           |

Freshness thresholds are configuration-dependent. The UI should present the configured expected interval when it helps interpretation; do not invent a universal time window.

## 7. Anomaly visualization

Each anomaly marker or segment should provide:

- Event identifier or link.
- Detection timestamp.
- Affected asset and metric(s).
- Anomaly type or model/rule source.
- Severity or score with clear meaning.
- Supporting interval before/after the detection point.
- A link to the anomaly/incident detail view.

If the model produces a score rather than calibrated probability, label it `Anomaly score`, not `Failure probability`. Avoid implying that an anomaly automatically means equipment failure.

For multivariate anomaly events, show the key contributing signals and provide a detail view; do not attempt to label every line at once in the main chart.

## 8. Prediction and forecast visualization

Prediction UI must distinguish the following:

- Predicted value vs observed value.
- Prediction horizon.
- Model/version where appropriate for technical users.
- Confidence interval or uncertainty band only if the model actually provides a valid interval.
- Prediction timestamp.
- Data window used, when relevant.
- Model limitations or unavailable state where relevant.

Do not fabricate confidence intervals. Do not display a failure probability as a percent unless the model output is calibrated and the UI can explain its prediction horizon and definition. For an uncalibrated score, use neutral terms such as `Model score` and provide an explanation.

## 9. Risk and health visualizations

- Use numeric values with labels; avoid unexplained circular gauges.
- Explain the scale, category thresholds, and inputs contributing to the risk score.
- Distinguish risk from current operational state.
- Distinguish unknown from low risk.
- Show the age and quality of supporting telemetry.
- Show `Insufficient data` or `Unknown` when inputs are missing; do not convert missing values to healthy.
- Provide a link to the risk assessment rationale and related events.

## 10. Site and portfolio analytics

Portfolio-level charts must include:

- Scope (organization, site, building, or asset group).
- Reporting period.
- Inclusion/exclusion rules.
- Count of assets included and unavailable.
- Definition of any rate/percentage (e.g., availability denominator).

Comparisons across sites should account for different asset counts and operating hours. Raw incident counts alone may be misleading; include normalized rates only when denominator definitions are clear.

## 11. Time, timezone, and aggregation

- Store and exchange timestamps in UTC at the service boundary.
- Display times in the user's selected timezone or site timezone, clearly identified.
- The UI must distinguish event time from ingestion time where delayed data matters.
- Date ranges must state whether endpoints are inclusive and what timezone is used.
- When aggregating, disclose the aggregation interval.
- Avoid mixing raw and aggregated points without visual explanation.
- Handle daylight-saving transitions in supported regions without duplicate or missing local-time labels.

## 12. Tooltips and chart interactions

- Hover tooltips must also be reachable by keyboard/focus or an equivalent data inspection control.
- Tooltips show timestamp, value, unit, series, quality, and status where relevant.
- A chart brush/zoom must provide a visible reset action.
- Legend toggles must preserve a way to know which series are hidden.
- Clicking an anomaly marker opens a detail panel or route.
- Time range changes must preserve the selected asset and metric.
- Live updates must not reset a user's selected range unexpectedly.

## 13. Responsive behavior

- Desktop may show multiple aligned charts.
- Tablet stacks charts when axis labels or legends become crowded.
- Mobile shows one metric at a time or uses small multiples with compact legends.
- Keep data freshness, unit, and anomaly evidence visible at all sizes.
- Provide a tabular data view or export path for high-density details.

## 14. Visualization examples to include in Figma

1. Generator temperature with warning and critical thresholds.
2. Vibration trend with anomaly markers.
3. Voltage/current charts with explicit units.
4. Asset risk ranking.
5. Health distribution summary.
6. Actual-vs-forecast chart (later phase, marked as preview if not enabled).
7. Stale telemetry chart state.
8. Missing/partial data state.
9. No-threshold-configured state.
10. Simulated data banner and chart treatment.

## 15. Acceptance criteria

- [ ] Every chart identifies metric, unit, range, and freshness.
- [ ] Missing data is not drawn as measured data.
- [ ] Simulated data is visibly marked.
- [ ] Threshold source and type are disclosed.
- [ ] Observed and predicted values are visually distinct.
- [ ] Anomaly markers link to evidence/details.
- [ ] Risk scales and unknown states are explained.
- [ ] Essential information is available without hover and via text/table alternatives.
- [ ] Mobile charts remain readable and operable.
- [ ] Timezone and aggregation behavior are documented.
