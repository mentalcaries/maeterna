import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table"
import {
  bpSlotFor,
  datesSpanMultipleYears,
  groupByLocalDate,
  toLocalDateStr,
} from "@/lib/reading-history"
import type { ApiReading, BPSlot } from "@/lib/reading-history"
import { ReadingHistoryCell } from "./ReadingHistoryCell"

const BP_SLOTS: { key: BPSlot; label: string }[] = [
  { key: "AM", label: "AM" },
  { key: "PM", label: "PM" },
]

interface BPHistoryTableProps {
  readings: ApiReading[]
  onEditNote: (reading: ApiReading) => void
  onHoverReading: (readingId: string | null) => void
}

export function BPHistoryTable({
  readings,
  onEditNote,
  onHoverReading,
}: BPHistoryTableProps) {
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
          {BP_SLOTS.map((slot) => (
            <TableHead key={slot.key} className="w-1/2">
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
            {BP_SLOTS.map((slot) => {
              const slotReadings = row.readings.filter(
                (r) => bpSlotFor(r) === slot.key
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
                          valueLabel={`${r.value1}/${r.value2 ?? "?"} mmHg`}
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
