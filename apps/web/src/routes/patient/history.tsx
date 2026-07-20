import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { ReadingList } from "@/components/readings/ReadingList"
import { EditReadingDialog } from "@/components/readings/EditReadingDialog"
import { DeleteReadingDialog } from "@/components/readings/DeleteReadingDialog"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/select"
import { Label } from "@/components/label"
import { adaptReading } from "@/lib/readings"
import { cn } from "@/lib/utils"
import { type TimeRange, RANGE_LABELS, rangeToFrom } from "@/lib/time-range"
import { useSession } from "@/lib/session"
import { getAppUser } from "@/lib/auth-client"
import type { Reading } from "@/mock/db"

export const Route = createFileRoute("/patient/history")({
  component: PatientHistoryPage,
})

function PatientHistoryPage() {
  const [typeFilter, setTypeFilter] = useState<
    "all" | "glucose" | "blood_pressure"
  >("all")
  const [range, setRange] = useState<TimeRange>("month")
  const [editingReading, setEditingReading] = useState<Reading | null>(null)
  const [deletingReading, setDeletingReading] = useState<Reading | null>(null)
  const { data: sessionData } = useSession()

  const { data } = useQuery({
    queryKey: ["readings", typeFilter, range],
    queryFn: () =>
      apiClient.GET("/patients/me/readings", {
        params: {
          query: {
            type: typeFilter === "all" ? undefined : typeFilter,
            from: rangeToFrom(range),
            limit: 50,
          },
        },
      }),
  })

  const { data: prefsData } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiClient.GET("/preferences"),
  })

  const apiReadings = data?.data?.data ?? []
  const total = data?.data?.total ?? 0
  const readings = apiReadings.map(adaptReading)
  const glucoseUnit =
    (prefsData?.data?.glucoseUnit as "mg/dL" | "mmol/L" | undefined) ?? "mg/dL"
  const user = getAppUser(sessionData)

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-2xl font-semibold">Reading history</h1>
        <p className="text-base text-muted-foreground">
          {total} readings total
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="type-filter"
          className="text-base font-medium tracking-normal normal-case"
        >
          Filter by type
        </Label>
        <Select
          value={typeFilter}
          onValueChange={(v) =>
            setTypeFilter(v as "all" | "glucose" | "blood_pressure")
          }
          items={{
            all: "All readings",
            glucose: "Glucose only",
            blood_pressure: "Blood pressure only",
          }}
        >
          <SelectTrigger id="type-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All readings</SelectItem>
            <SelectItem value="glucose">Glucose only</SelectItem>
            <SelectItem value="blood_pressure">Blood pressure only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-base font-medium tracking-normal normal-case">
          Time range
        </Label>
        <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border p-0.5">
          {(Object.keys(RANGE_LABELS) as TimeRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <ReadingList
        readings={readings}
        glucoseUnit={glucoseUnit}
        emptyMessage="No readings match your filter."
        editableById={user?.id}
        onEdit={setEditingReading}
        onDelete={setDeletingReading}
      />

      <EditReadingDialog
        reading={editingReading}
        glucoseUnit={glucoseUnit}
        open={editingReading !== null}
        onOpenChange={(open) => {
          if (!open) setEditingReading(null)
        }}
      />
      <DeleteReadingDialog
        reading={deletingReading}
        glucoseUnit={glucoseUnit}
        open={deletingReading !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingReading(null)
        }}
      />
    </div>
  )
}
