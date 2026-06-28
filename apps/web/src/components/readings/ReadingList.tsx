import { ReadingBadge } from "@/components/readings/ReadingBadge"
import type { Reading } from "@/mock/db"

interface ReadingListProps {
  readings: Reading[]
  emptyMessage?: string
}

const MEAL_LABELS: Record<string, string> = {
  fasted: "Fasted",
  post_meal: "After eating",
}

const TIME_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  before_bed: "Night",
  at_clinic: "At clinic",
}

function readingSubtitle(r: Reading): string {
  const parts: string[] = []

  if (r.type === "glucose" && r.mealContext) {
    parts.push(MEAL_LABELS[r.mealContext] ?? r.mealContext)
  }

  if (r.timeOfDay) {
    parts.push(TIME_LABELS[r.timeOfDay] ?? r.timeOfDay)
  } else if (!r.mealContext) {
    // legacy seed data fallback
    const legacy: Record<string, string> = {
      fasting: "Fasting",
      post_meal: "After eating",
      morning: "Morning",
      before_bed: "Night",
    }
    parts.push(legacy[r.context] ?? r.context)
  }

  const d = new Date(r.timestamp)
  const dateStr = d.toLocaleDateString("en-TT", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const timeStr = d.toLocaleTimeString("en-TT", {
    hour: "2-digit",
    minute: "2-digit",
  })
  parts.push(`${dateStr} ${timeStr}`)

  return parts.join(" · ")
}

export function ReadingList({
  readings,
  emptyMessage = "No readings yet.",
}: ReadingListProps) {
  if (readings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {readings.map((r) => {
        const valueStr =
          r.type === "blood_pressure"
            ? `${r.value1}/${r.value2 ?? "?"} mmHg`
            : `${r.value1} mmol/L`

        return (
          <div key={r.id} className="flex flex-col gap-1 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{valueStr}</p>
                <p className="text-xs text-muted-foreground">
                  {readingSubtitle(r)}
                </p>
              </div>
              <ReadingBadge severity={r.severity} />
            </div>
            {r.notes && (
              <p className="text-xs text-muted-foreground italic">{r.notes}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
