# Backend: Computed-on-read severity, binary thresholds, context enum

## Objective

Refactor reading severity from a stored column to a value computed on read. Replace the 3-tier severity model (`normal`/`warning`/`critical`) with a binary model (`normal`/`high`). Constrain the `context` column. Restructure the `threshold` table to one row per patient with 4 threshold values.

## Schema changes (`apps/api` — Drizzle, SQLite/D1)

### `reading` table

1. Remove the `severity` column entirely.
2. Constrain `context`:

```ts
context: text("context", {
  enum: ["fasted", "post_meal", "morning", "evening"],
}).notNull(),
```

Existing data already conforms to these values — no data migration needed for `context`.

### `threshold` table

Replace the 8 warning/critical columns with 4 binary threshold columns. One row per patient.

```ts
export const threshold = sqliteTable("threshold", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  doctorId: text("doctor_id")
    .notNull()
    .references(() => user.id), // last updated by — attribution only
  fastingGlucoseHigh: real("fasting_glucose_high").notNull(),
  postMealGlucoseHigh: real("post_meal_glucose_high").notNull(),
  systolicHigh: real("systolic_high").notNull(),
  diastolicHigh: real("diastolic_high").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})
```

Note: unique index moves from `(patientId, doctorId)` to `patientId` alone. Any doctor with access to the patient may update the row; `doctorId` records who updated it last.

### Migration

- Drop `severity` from `reading`.
- Recreate/alter `threshold` per above. Existing threshold rows: if any exist, map `fastingGlucoseCritical` → `fastingGlucoseHigh`, `postMealGlucoseCritical` → `postMealGlucoseHigh`, `systolicCritical` → `systolicHigh`, `diastolicCritical` → `diastolicHigh`, and collapse duplicate rows per patient keeping the most recently updated. If mapping is impractical, dropping existing threshold rows is acceptable (defaults apply).

## Severity computation (new shared module)

Create a single pure function used by all readings-serving endpoints:

```ts
type Severity = "normal" | "high"

const DEFAULT_THRESHOLDS = {
  fastingGlucoseHigh: 95, // mg/dL
  postMealGlucoseHigh: 140, // mg/dL
  systolicHigh: 140, // mmHg
  diastolicHigh: 90, // mmHg
}

function computeSeverity(reading, thresholds): Severity
```

Rules (all glucose values in canonical mg/dL):

| Type           | Context           | High when                                         |
| -------------- | ----------------- | ------------------------------------------------- |
| glucose        | fasted            | value1 >= fastingGlucoseHigh                      |
| glucose        | post_meal         | value1 > postMealGlucoseHigh                      |
| blood_pressure | morning / evening | value1 >= systolicHigh OR value2 >= diastolicHigh |

Everything else is `normal`. There is no lower-bound evaluation and no `warning` tier.

## Endpoint changes

### Readings endpoints (all that return readings)

1. Fetch the patient's `threshold` row once per request; fall back to `DEFAULT_THRESHOLDS` if none exists.
2. Attach computed `severity` to each reading in the response.
3. Response schema keeps a `severity` field with enum `["normal", "high"]` — the field is computed, not stored.
4. Add optional `from` query param (ISO 8601 datetime) to the patient readings list endpoints, filtering `timestamp >= from`. Used by the frontend time-range filter.

### Reading create/update endpoints

1. Remove any severity computation/storage on write.
2. Zod validation: enforce type→context pairing with a discriminated union on `type`:
   - `glucose` → context must be `fasted` or `post_meal`
   - `blood_pressure` → context must be `morning` or `evening`

### Threshold endpoints

1. Update to the 4-field shape. `PUT`/`POST` upserts the single row per patient, setting `doctorId` to the authenticated doctor.
2. `GET` returns the patient's row, or the defaults with an indicator (e.g., `isDefault: true`) if no row exists.
3. No recompute logic anywhere — severity is derived on read.

## OpenAPI / types

1. Update `maeterna-openapi.yaml`: severity enum `["normal", "high"]`, context enum values, new threshold shape, `from` query param.
2. Regenerate `api.types.ts` via `openapi-typescript` after backend changes are complete.

## Out of scope

- Frontend changes (separate prompt).
- Any alerting, notification, or cross-patient severity querying.

## Acceptance criteria

- [ ] `reading` table has no `severity` column; `context` constrained to the 4 values
- [ ] `threshold` table has 4 threshold columns, unique on `patientId`
- [ ] Readings responses include computed `severity` (`normal`/`high`) using patient thresholds or defaults
- [ ] Glucose fasted 95 → high; 94 → normal. Glucose post-meal 140 → normal; 141 → high. BP 140/85 → high; 139/90 → high; 139/89 → normal
- [ ] Changing a patient's thresholds changes severities in subsequent reads with no writes to `reading`
- [ ] Writes reject invalid type→context pairs (e.g., glucose + morning)
- [ ] `from` param filters readings by timestamp
- [ ] OpenAPI spec updated; `api.types.ts` regenerated
