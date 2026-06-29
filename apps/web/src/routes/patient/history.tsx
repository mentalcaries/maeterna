import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { ReadingList } from "@/components/readings/ReadingList"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/select"
import { Label } from "@/components/label"
import type { Reading } from "@/mock/db"
import type { components } from "@/lib/api.types"

export const Route = createFileRoute("/patient/history")({
  component: PatientHistoryPage,
})

function adaptReading(r: components["schemas"]["Reading"]): Reading {
  return {
    id: r.id,
    patientId: r.patientId,
    loggedById: r.loggedById,
    type: r.type,
    value1: r.value1,
    value2: r.value2 ?? undefined,
    unit: r.unit,
    context: r.context as import("@/mock/db").ReadingContext,
    notes: r.notes ?? undefined,
    timestamp: r.timestamp,
    severity: r.severity === "normal" ? undefined : r.severity,
  }
}

function PatientHistoryPage() {
  const [typeFilter, setTypeFilter] = useState<
    "all" | "glucose" | "blood_pressure"
  >("all")

  const { data } = useQuery({
    queryKey: ["readings", typeFilter],
    queryFn: () =>
      apiClient.GET("/patients/me/readings", {
        params: {
          query: {
            type: typeFilter === "all" ? undefined : typeFilter,
            limit: 50,
          },
        },
      }),
  })

  const apiReadings = data?.data?.data ?? []
  const total = data?.data?.total ?? 0
  const readings = apiReadings.map(adaptReading)

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-xl font-semibold">Reading history</h1>
        <p className="text-sm text-muted-foreground">{total} readings total</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type-filter">Filter by type</Label>
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

      <ReadingList
        readings={readings}
        emptyMessage="No readings match your filter."
      />
    </div>
  )
}
