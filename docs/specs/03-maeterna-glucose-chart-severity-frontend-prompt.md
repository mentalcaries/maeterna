# Frontend: Nested-band glucose chart, binary severity UI, time range filter

## Prerequisite

The backend prompt (`maeterna-severity-computed-on-read-backend-prompt.md`) must be implemented first and `api.types.ts` regenerated. Severity is now computed server-side and returned as `"normal" | "high"` on each reading. The `warning`/`critical` values no longer exist.

## Scope (`apps/web` — React, TanStack Router/Query)

### 1. Severity display

1. Replace all `warning`/`critical` severity handling with the binary `normal`/`high` model.
2. Doctor dashboard reading history: status badges show `NORMAL` (success styling) or `HIGH` (danger styling). Remove `WARNING`/`CRITICAL` badges.
3. Patient portal: severity remains color-only dots (no text labels) — map `normal`/`high` to the existing dot color system.
4. Alert counts (e.g., "N ALERTS in reading history") count readings with severity `high`.

### 2. Glucose chart — nested threshold bands

Replace the current dashed warn/crit lines with:

1. **Two nested shaded zones** (theme token colors, translucent):
   - Fasted normal zone: 65 to fastingGlucoseHigh (default 95) — stronger opacity
   - Post-meal normal zone: 65 to postMealGlucoseHigh (default 140) — lighter opacity
   - The fasted zone renders on top of (inside) the post-meal zone.
2. **Two dashed threshold lines** with labels:
   - `fasted limit {value}` at fastingGlucoseHigh
   - `post-meal limit {value}` at postMealGlucoseHigh
3. Band boundaries and labels use the patient's actual thresholds from the API (defaults if unset), not hardcoded values. 65 is a fixed visual floor for both bands — it is not a threshold and is never evaluated.
4. Respect the mg/dL ↔ mmol/L unit toggle: convert band boundaries, line labels, and axis with the same conversion as readings.

### 3. Glucose chart — points

1. Point shape by context: circle = `fasted`, triangle = `post_meal`.
2. Point color by the reading's own `severity`: normal → success color, high → danger color (theme tokens).
3. Connecting line: neutral/muted color, thin — the points carry the meaning.
4. Tooltip per point: value + unit, context (`fasted` / `post-meal`), severity.
5. Legend explaining: both zones, both point shapes, both point colors.

### 4. Time range filter

1. Segmented control near the chart: `Past week` / `Past 2 weeks` / `Past month` / `All time`. Default: `Past month`.
2. Selection maps to a `from` ISO datetime query param on the readings request (`All time` omits the param).
3. Include the selected range in the TanStack Query key so each range is cached independently.
4. The filter applies to both the chart and the reading history table, and to both glucose and blood pressure views.

### 5. Set thresholds dialog

1. Update to the new 4-field shape: fasting glucose high, post-meal glucose high, systolic high, diastolic high.
2. Pre-fill with the patient's current values (or defaults, indicated as such).
3. Glucose fields respect the doctor's unit preference for display; submit in canonical mg/dL.
4. On successful save, invalidate the readings queries so severities refresh.

### 6. Blood pressure chart

1. Apply the same binary severity to point colors.
2. Threshold reference lines at systolicHigh and diastolicHigh for the respective series.
3. Same time range filter.

## Out of scope

- Backend changes.
- Patient-facing chart redesign beyond severity color mapping.

## Acceptance criteria

- [ ] No references to `warning`/`critical` severities remain in the frontend
- [ ] Glucose chart shows two nested bands + two labeled dashed lines from actual patient thresholds
- [ ] Fasted readings render as circles, post-meal as triangles; color reflects each reading's own severity
- [ ] A 132 mg/dL post-meal reading renders normal while a 130 mg/dL fasted reading renders high
- [ ] Unit toggle converts bands, lines, tooltips, and axis consistently
- [ ] Time range filter refetches with `from` param and updates chart + table
- [ ] Set thresholds dialog has 4 fields; saving refreshes displayed severities without page reload
- [ ] Alert count reflects `high` readings only
