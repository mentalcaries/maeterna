import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/card"
import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { Input } from "@/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select"
import { PatientAccessGuideDialog } from "@/components/doctor/PatientAccessGuideDialog"
import { apiClient } from "@/lib/api-client"
import {
  RiAlertLine,
  RiArrowRightLine,
  RiRefreshLine,
  RiSearchLine,
  RiShieldLine,
} from "@remixicon/react"
import { useState } from "react"

export const Route = createFileRoute("/doctor/dashboard")({
  component: DoctorDashboardPage,
})

function DoctorDashboardPage() {
  const [accessGuideOpen, setAccessGuideOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortMode, setSortMode] = useState<"recent" | "alphabetical">("recent")
  const {
    data: patientList = [],
    isPending,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["doctor-patients"],
    queryFn: async () => {
      const res = await apiClient.GET("/doctors/me/patients")
      return res.data ?? []
    },
  })
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
  const visiblePatients = patientList
    .filter(({ patient }) => {
      const name = `${patient.firstName} ${patient.lastName}`
        .trim()
        .toLocaleLowerCase()
      return name.includes(normalizedQuery)
    })
    .sort((a, b) => {
      const nameA = `${a.patient.firstName} ${a.patient.lastName}`.trim()
      const nameB = `${b.patient.firstName} ${b.patient.lastName}`.trim()
      const alphabetical = nameA.localeCompare(nameB, undefined, {
        sensitivity: "base",
      })

      if (sortMode === "alphabetical") return alphabetical
      if (a.lastViewedAt && b.lastViewedAt) {
        return b.lastViewedAt.localeCompare(a.lastViewedAt) || alphabetical
      }
      if (a.lastViewedAt) return -1
      if (b.lastViewedAt) return 1
      return alphabetical
    })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Patients</h1>
          <p className="text-sm text-muted-foreground">
            {isPending ? "Loading…" : `${patientList.length} patients assigned`}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setAccessGuideOpen(true)}
          >
            <RiShieldLine />
            How to get access
          </Button>
          <Button
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary/5 sm:w-auto"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RiRefreshLine className={isFetching ? "animate-spin" : ""} />
            Refresh Patient List
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <RiSearchLine className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search patients by name"
            placeholder="Search patients by name…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="rounded-md pl-9"
          />
        </div>
        <Select
          value={sortMode}
          onValueChange={(value) =>
            setSortMode(value as "recent" | "alphabetical")
          }
          items={{
            recent: "Recently viewed",
            alphabetical: "Alphabetical: A–Z",
          }}
        >
          <SelectTrigger aria-label="Sort patients" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently viewed</SelectItem>
            <SelectItem value="alphabetical">Alphabetical: A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {patientList.length === 0 && !isPending ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No patients assigned yet.
        </div>
      ) : visiblePatients.length === 0 && !isPending ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No patients found.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visiblePatients.map(
            ({ patient, unreadAlertCount, lastReadingAt }) => {
              return (
                <Link
                  key={patient.id}
                  to="/doctor/patients/$id"
                  params={{ id: patient.id }}
                >
                  <Card className="transition-colors hover:bg-muted/30">
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {patient.firstName} {patient.lastName}
                          </span>
                          {patient.status === "suspended" && (
                            <Badge variant="destructive">Suspended</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {lastReadingAt
                            ? `Last reading: ${new Date(lastReadingAt).toLocaleDateString("en-TT", { month: "short", day: "numeric" })}`
                            : "No readings yet"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadAlertCount > 0 && (
                          <Badge
                            variant="critical"
                            className="flex items-center gap-1"
                          >
                            <RiAlertLine className="size-3" />
                            {unreadAlertCount}
                          </Badge>
                        )}
                        <RiArrowRightLine className="size-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            }
          )}
        </div>
      )}

      <PatientAccessGuideDialog
        open={accessGuideOpen}
        onOpenChange={setAccessGuideOpen}
      />
    </div>
  )
}
