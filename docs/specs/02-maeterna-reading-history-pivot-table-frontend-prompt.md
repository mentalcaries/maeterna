# Frontend: Pivoted reading history tables (date-row layout)

## Prerequisites

- The backend severity refactor (`maeterna-severity-computed-on-read-backend-prompt.md`) is implemented: severity is computed on read and returned as `"normal" | "high"` per reading; `context` is constrained to `fasted` / `post_meal` (glucose) and `morning` / `evening` (blood pressure).
- The chart time-range filter (issue #3) is implemented: a segmented control (Past week / Past 2 weeks / Past month / All time) drives a `from` query param on the readings request.
- `api.types.ts` is current.

## Objective

Replace the flat chronological reading history table on the doctor's patient-detail view with two pivoted tables — one for glucose, one for blood pressure — where each row is a calendar date and each reading is placed into a slot column. High readings are highlighted per cell. Both tables share the existing chart time-range filter.

## Scope

`apps/web` — doctor dashboard patient-detail route only. The patient portal reading list is out of scope.

---

## 1. Data transformation

### Grouping

1. Split readings by `type` into glucose and blood pressure sets.
2. Group each set by calendar date, derived from `timestamp` in the browser's local timezone (Trinidad & Tobago, UTC-4, no DST — but use the standard local-time APIs, do not hardcode an offset).
3. Sort rows by date descending (most recent first).

### Glucose slot assignment

Each glucose reading is assigned to exactly one of four slots:

| Slot           | Rule                                                    |
| -------------- | ------------------------------------------------------- |
| Fasted         | `context === "fasted"`                                  |
| Breakfast +1hr | `context === "post_meal"` and local hour < 11           |
| Lunch +1hr     | `context === "post_meal"` and local hour >= 11 and < 16 |
| Dinner +1hr    | `context === "post_meal"` and local hour >= 16          |

Notes:

- The meal assignment is display-only inference from `timestamp`. The stored `context` is only `fasted` or `post_meal`; nothing is written back.
- The hour boundaries (11 and 16) must be defined as named constants in one place (e.g., `MEAL_SLOT_BOUNDARIES`) — not scattered magic numbers.
- Implement the slot logic as a pure, unit-testable function: `(reading) => "fasted" | "breakfast" | "lunch" | "dinner"`.

### Blood pressure slot assignment

| Slot | Rule                    |
| ---- | ----------------------- |
| AM   | `context === "morning"` |
| PM   | `context === "evening"` |

Assignment is by stored context, not by timestamp hour.

### Collisions (multiple readings in the same slot on the same date)

- Render **all** readings in that cell, stacked vertically, each with its own value, note, severity indicator, and note action.
- Order within a cell: chronological ascending (earliest at top).
- This applies to both tables (e.g., a patient logging two fasted readings, or legacy data with two `morning` BP readings).

---

## 2. Glucose table

### Columns

| #   | Header         | Content                                                                                                          |
| --- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | Date           | e.g., `3 Jun` with year shown when the range spans years (match existing date formatting conventions in the app) |
| 2   | Fasted         | reading cell(s) or empty state                                                                                   |
| 3   | Breakfast +1hr | reading cell(s) or empty state                                                                                   |
| 4   | Lunch +1hr     | reading cell(s) or empty state                                                                                   |
| 5   | Dinner +1hr    | reading cell(s) or empty state                                                                                   |

There is **no Status column**. Severity is conveyed per cell (below).

### Reading cell anatomy

Each reading within a cell renders:

1. **Value + unit** — e.g., `132 mg/dL`, respecting the doctor's mg/dL ↔ mmol/L unit preference (same conversion pipeline as the chart).
2. **Time** — the reading's local time (e.g., `09:00 am`), small/muted, so collisions and unusual logging times are interpretable.
3. **Note** — below the value, muted/italic styling consistent with the current table. Truncate long notes with ellipsis + full text on hover (title attribute or tooltip).
4. **Note action** — a small icon button per reading: edit icon when a note exists, add icon when it does not. Reuses the existing edit/add note dialog and mutation. Must have an accessible label (e.g., `aria-label="Edit note for 132 mg/dL reading on 3 Jun"`).

### Severity indication (per cell, per reading)

- `high` reading: background tint on that reading's block using the danger/high theme tokens (same family as the chart's high point color), with a dot indicator as a redundant cue.
- `normal` reading: no tint, no dot — unstyled so high values stand out.
- If a cell contains a mix (collision case), each stacked reading carries its own indicator independently.

### Empty cells

- A slot with no reading renders an em dash (`—`) in muted text. No interactive elements.

---

## 3. Blood pressure table

### Columns

| #   | Header | Content                          |
| --- | ------ | -------------------------------- |
| 1   | Date   | same formatting as glucose table |
| 2   | AM     | reading cell(s) or empty state   |
| 3   | PM     | reading cell(s) or empty state   |

### Reading cell anatomy

Same as glucose cells, with:

1. **Value** — `systolic/diastolic mmHg`, e.g., `110/40 mmHg`.
2. Time, note, and note action identical to glucose cells.

### Severity indication

Identical per-cell treatment: `high` (systolic >= threshold OR diastolic >= threshold, as computed by the API) gets tint + dot; `normal` unstyled.

---

## 4. Layout and placement

1. The two tables replace the single READING HISTORY table on the patient-detail view.
2. The existing GLUCOSE / BLOOD PRESSURE toggle at the top of the page already switches the chart; the visible history table must follow the same toggle — glucose view shows the glucose table, blood pressure view shows the BP table. Do not render both tables simultaneously.
3. Keep the `READING HISTORY` section heading.
4. Table styling follows the existing table (typography, row dividers, muted headers). Column widths: Date column narrow and fixed; slot columns equal width.
5. Responsive behavior: at narrow widths allow horizontal scroll on the table container rather than wrapping or dropping columns.

---

## 5. Date range filtering

1. Both tables consume the **same** time-range state as the chart (the issue #3 segmented control). One control drives chart and table together — no separate filter UI for the table.
2. The tables render from the same TanStack Query data as the chart (same query key including the range). No duplicate fetches.
3. `All time` renders all rows; no pagination is required in this iteration.
4. Dates with no readings in the selected range simply do not appear — do not render empty date rows to fill the calendar.

---

## 6. Explicitly out of scope

- Patient portal reading list changes.
- Backend/API changes of any kind.
- Pagination or virtualization.
- Editing reading values (note editing only, as today).
- Writing inferred meal names to the database.

---

## Acceptance criteria

- [ ] Glucose history renders one row per date with Fasted / Breakfast +1hr / Lunch +1hr / Dinner +1hr columns; BP history renders Date / AM / PM
- [ ] A `post_meal` reading at 09:00 local appears under Breakfast +1hr; at 12:00 under Lunch +1hr; at 18:30 under Dinner +1hr; boundaries (11:00, 16:00) defined as named constants in one module
- [ ] `fasted` readings never appear in meal columns regardless of time; BP slotting uses `context`, not time
- [ ] Two readings in the same slot on the same date render stacked in one cell, earliest first, each with its own value, time, note, indicator, and note action
- [ ] `high` readings show a background tint + dot within their cell; `normal` readings are unstyled; no Status column exists
- [ ] Notes render below values; note edit/add action is per reading with accessible labels and reuses the existing dialog
- [ ] Empty slots render an em dash with no interactive elements
- [ ] The GLUCOSE / BLOOD PRESSURE toggle switches which table is shown
- [ ] Changing the chart time range updates the visible table rows with no additional network request beyond the shared query
- [ ] Unit toggle (mg/dL ↔ mmol/L) converts glucose values in the table consistently with the chart
- [ ] Slot-assignment function has unit tests covering: fasted, each meal boundary edge (10:59 / 11:00 / 15:59 / 16:00), and collision grouping
