import { RiAddLine, RiEditLine } from "@remixicon/react"
import { Button } from "@/components/button"
import { cn } from "@/lib/utils"
import { toLocalDateStr } from "@/lib/reading-history"
import type { ApiReading } from "@/lib/reading-history"

interface ReadingHistoryCellProps {
  reading: ApiReading
  valueLabel: string
  onEditNote: (reading: ApiReading) => void
  onHoverReading: (readingId: string | null) => void
}

export function ReadingHistoryCell({
  reading,
  valueLabel,
  onEditNote,
  onHoverReading,
}: ReadingHistoryCellProps) {
  const isHigh = reading.severity === "high"
  const dateStr = toLocalDateStr(new Date(reading.timestamp))

  return (
    <div className="flex items-start justify-between gap-2 rounded-sm px-2 py-1">
      <div className="min-w-0">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-sm font-medium transition-shadow hover:ring-1 hover:ring-primary/50",
            isHigh && "bg-red-100 dark:bg-red-900/30"
          )}
          onMouseEnter={() => onHoverReading(reading.id)}
          onMouseLeave={() => onHoverReading(null)}
        >
          {isHigh && (
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-red-600 dark:bg-red-400"
            />
          )}
          {valueLabel}
        </span>
        {reading.notes && (
          <p
            className="mt-0.5 max-w-[160px] truncate text-sm text-muted-foreground italic"
            title={reading.notes}
          >
            {reading.notes}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        className="shrink-0"
        aria-label={`${reading.notes ? "Edit" : "Add"} note for ${valueLabel} reading on ${dateStr}`}
        onClick={() => onEditNote(reading)}
      >
        {reading.notes ? <RiEditLine /> : <RiAddLine />}
      </Button>
    </div>
  )
}
