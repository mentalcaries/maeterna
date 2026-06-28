import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { getSession } from "@/mock/auth"
import { getPatientReadings } from "@/mock/db"
import { ReadingList } from "@/components/readings/ReadingList"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@workspace/ui/components/select"
import { Label } from "@workspace/ui/components/label"

export const Route = createFileRoute("/patient/history")({
  component: PatientHistoryPage,
})

function PatientHistoryPage() {
  const session = getSession()
  const [typeFilter, setTypeFilter] = useState<
    "all" | "glucose" | "blood_pressure"
  >("all")

  if (!session) return null

  const allReadings = getPatientReadings(session.userId)
  const filtered =
    typeFilter === "all"
      ? allReadings
      : allReadings.filter((r) => r.type === typeFilter)

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-xl font-semibold">Reading history</h1>
        <p className="text-sm text-muted-foreground">
          {allReadings.length} readings total
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type-filter">Filter by type</Label>
        <Select
          value={typeFilter}
          onValueChange={(v) =>
            setTypeFilter(v as "all" | "glucose" | "blood_pressure")
          }
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

      <ReadingList
        readings={filtered}
        emptyMessage="No readings match your filter."
      />
    </div>
  )
}
