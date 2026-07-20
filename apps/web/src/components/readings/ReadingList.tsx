import { cn } from "@/lib/utils"
import { formatReadingValue, readingContext } from "@/lib/readings"
import type { Reading } from "@/mock/db"
import { Button } from "@/components/button"
import { RiDeleteBinLine, RiEditLine } from "@remixicon/react"

interface ReadingListProps {
  readings: Reading[]
  glucoseUnit?: "mg/dL" | "mmol/L"
  emptyMessage?: string
  editableById?: string
  onEdit?: (reading: Reading) => void
  onDelete?: (reading: Reading) => void
}

function readingSubtitle(r: Reading): string {
  const parts = [readingContext(r)]

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
  glucoseUnit = "mg/dL",
  emptyMessage = "No readings yet.",
  editableById,
  onEdit,
  onDelete,
}: ReadingListProps) {
  if (readings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-base text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {readings.map((r) => {
        const valueStr = formatReadingValue(r, glucoseUnit)
        const canManage =
          r.loggedById === editableById && Boolean(onEdit || onDelete)

        return (
          <div key={r.id} className="flex flex-col gap-1 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold">{valueStr}</p>
                <p className="text-xs text-muted-foreground">
                  {readingSubtitle(r)}
                </p>
              </div>
              <span
                className={cn(
                  "mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                  r.severity === "high" ? "bg-red-500" : "bg-green-500"
                )}
              />
            </div>
            {r.notes && (
              <p className="text-xs text-muted-foreground italic">{r.notes}</p>
            )}
            {canManage && (
              <div className="mt-2 flex items-center justify-end gap-2">
                {onEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11"
                    aria-label={`Edit ${valueStr} reading`}
                    onClick={() => onEdit(r)}
                  >
                    <RiEditLine className="size-4" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-11"
                    aria-label={`Delete ${valueStr} reading`}
                    onClick={() => onDelete(r)}
                  >
                    <RiDeleteBinLine className="size-4" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
