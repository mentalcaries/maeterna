import { execFileSync } from "node:child_process"

const args = new Set(process.argv.slice(2).filter((arg) => arg !== "--"))
const write = args.has("--write")
const local = args.has("--local")

if ([...args].some((arg) => arg !== "--write" && arg !== "--local")) {
  throw new Error("Usage: pnpm backfill:daily-readings [--local] [--write]")
}

const timeZone = "America/Port_of_Spain"
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone,
  hour: "2-digit",
  hourCycle: "h23",
})

function query(sql) {
  const output = execFileSync(
    "pnpm",
    [
      "exec",
      "wrangler",
      "d1",
      "execute",
      "maeterna",
      local ? "--local" : "--remote",
      "--command",
      sql,
      "--json",
    ],
    { cwd: process.cwd(), encoding: "utf8", maxBuffer: 10_000_000 }
  )
  const response = JSON.parse(output)
  if (!response[0]?.success) throw new Error(`D1 query failed: ${output}`)
  return response[0].results ?? []
}

function localDate(timestamp) {
  const parts = Object.fromEntries(
    dateFormatter
      .formatToParts(new Date(timestamp * 1000))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

function localHour(timestamp) {
  return Number(hourFormatter.format(new Date(timestamp * 1000)))
}

function inferredMealSlot(timestamp) {
  const hour = localHour(timestamp)
  if (hour < 11) return "post_breakfast"
  if (hour < 16) return "post_lunch"
  return "post_dinner"
}

function key(...parts) {
  return parts.join("|")
}

function quote(value) {
  return `'${value.replaceAll("'", "''")}'`
}

const legacyReadings = query(`
  SELECT id, patient_id, logged_by_id, type, context, timestamp, created_at
  FROM reading
  WHERE reading_date IS NULL
    AND slot IS NULL
    AND patient_id = logged_by_id
`)
const structuredReadings = query(`
  SELECT patient_id, logged_by_id, type, reading_date, slot
  FROM reading
  WHERE reading_date IS NOT NULL AND slot IS NOT NULL
`)

const occupied = new Set(
  structuredReadings.map((reading) =>
    key(
      reading.patient_id,
      reading.logged_by_id,
      reading.type,
      reading.reading_date,
      reading.slot
    )
  )
)
const candidates = []
const skipped = { ambiguous: 0, conflict: 0, unsupported: 0 }

function addCandidate(reading, slot, category) {
  const readingDate = localDate(reading.timestamp)
  const slotKey = key(
    reading.patient_id,
    reading.logged_by_id,
    reading.type,
    readingDate,
    slot
  )
  if (occupied.has(slotKey)) {
    skipped.conflict += 1
    return
  }
  occupied.add(slotKey)
  candidates.push({ id: reading.id, readingDate, slot, category })
}

const postMealByDay = new Map()
for (const reading of legacyReadings) {
  if (reading.type === "glucose" && reading.context === "fasted") {
    addCandidate(reading, "fasted", "fasting")
  } else if (
    reading.type === "blood_pressure" &&
    (reading.context === "morning" || reading.context === "evening")
  ) {
    addCandidate(reading, reading.context, "bloodPressure")
  } else if (reading.type === "glucose" && reading.context === "post_meal") {
    const groupKey = key(
      reading.patient_id,
      reading.logged_by_id,
      localDate(reading.timestamp)
    )
    const group = postMealByDay.get(groupKey) ?? []
    group.push(reading)
    postMealByDay.set(groupKey, group)
  } else {
    skipped.unsupported += 1
  }
}

for (const readings of postMealByDay.values()) {
  const byInferredSlot = new Map()
  for (const reading of readings) {
    const slot = inferredMealSlot(reading.timestamp)
    const group = byInferredSlot.get(slot) ?? []
    group.push(reading)
    byInferredSlot.set(slot, group)
  }

  if (readings.length === 3 && byInferredSlot.size === 1) {
    const batchSlots = ["post_breakfast", "post_lunch", "post_dinner"]
    const sorted = [...readings].sort(
      (left, right) => left.created_at - right.created_at
    )
    for (const [index, reading] of sorted.entries()) {
      addCandidate(reading, batchSlots[index], "postMealBatch")
    }
    continue
  }

  for (const [slot, slotReadings] of byInferredSlot) {
    if (slotReadings.length === 1)
      addCandidate(slotReadings[0], slot, "postMealTime")
    else skipped.ambiguous += slotReadings.length
  }
}

const counts = candidates.reduce(
  (summary, candidate) => {
    summary[candidate.category] += 1
    return summary
  },
  { fasting: 0, bloodPressure: 0, postMealTime: 0, postMealBatch: 0 }
)

console.log(`Target: ${local ? "local D1" : "production D1"}`)
console.log(`Mode: ${write ? "WRITE" : "DRY RUN"}`)
console.log(`Legacy patient-entered readings: ${legacyReadings.length}`)
console.log(`Fasting assignments: ${counts.fasting}`)
console.log(`Blood-pressure assignments: ${counts.bloodPressure}`)
console.log(`Time-based post-meal assignments: ${counts.postMealTime}`)
console.log(`Three-reading batch assignments: ${counts.postMealBatch}`)
console.log(`Ambiguous readings left unchanged: ${skipped.ambiguous}`)
console.log(`Conflicts left unchanged: ${skipped.conflict}`)
console.log(`Unsupported readings left unchanged: ${skipped.unsupported}`)

if (!write) {
  console.log("No readings were changed. Re-run with --write after review.")
  process.exit(0)
}

for (let index = 0; index < candidates.length; index += 50) {
  const updates = candidates.slice(index, index + 50).map(
    (candidate) => `UPDATE reading
      SET reading_date = ${quote(candidate.readingDate)}, slot = ${quote(candidate.slot)}
      WHERE id = ${quote(candidate.id)}
        AND reading_date IS NULL
        AND slot IS NULL`
  )
  query(updates.join(";\n"))
}

console.log(`Updated ${candidates.length} readings.`)
