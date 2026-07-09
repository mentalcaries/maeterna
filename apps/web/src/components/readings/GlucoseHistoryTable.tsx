import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table"
import { formatGlucose } from "@/lib/glucose"
import {
  datesSpanMultipleYears,
  glucoseSlotFor,
  groupByLocalDate,
  toLocalDateStr,
} from "@/lib/reading-history"
import type { ApiReading, GlucoseSlot } from "@/lib/reading-history"
import { ReadingHistoryCell } from "./ReadingHistoryCell"

const GLUCOSE_SLOTS: { key: GlucoseSlot; label: string }[] = [
  { key: "fasted", label: "Fasted" },
  { key: "breakfast", label: "Breakfast +1hr" },
  { key: "lunch", label: "Lunch +1hr" },
  { key: "dinner", label: "Dinner +1hr" },
]

interface GlucoseHistoryTableProps {
  readings: ApiReading[]
  displayUnit: "mg/dL" | "mmol/L"
  onEditNote: (reading: ApiReading) => void
  onHoverReading: (readingId: string | null) => void
}

export function GlucoseHistoryTable({
  readings,
  displayUnit,
  onEditNote,
  onHoverReading,
}: GlucoseHistoryTableProps) {
  if (readings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No readings logged yet.
      </div>
    )
  }

  const rows = groupByLocalDate(readings)
  const showYear = datesSpanMultipleYears(rows)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Date</TableHead>
          {GLUCOSE_SLOTS.map((slot) => (
            <TableHead key={slot.key} className="w-1/4">
              {slot.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.dateKey}>
            <TableCell className="align-top text-sm font-medium">
              {toLocalDateStr(row.date, { showYear })}
            </TableCell>
            {GLUCOSE_SLOTS.map((slot) => {
              const slotReadings = row.readings.filter(
                (r) => glucoseSlotFor(r) === slot.key
              )
              return (
                <TableCell key={slot.key} className="align-top">
                  {slotReadings.length === 0 ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {slotReadings.map((r) => (
                        <ReadingHistoryCell
                          key={r.id}
                          reading={r}
                          valueLabel={formatGlucose(r.value1, displayUnit)}
                          onEditNote={onEditNote}
                          onHoverReading={onHoverReading}
                        />
                      ))}
                    </div>
                  )}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
