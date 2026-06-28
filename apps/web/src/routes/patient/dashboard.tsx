import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { RiAddLine } from "@remixicon/react"
import { useSession } from "@/lib/session"
import { getAppUser } from "@/lib/auth-client"
import { apiClient } from "@/lib/api-client"
import { ReadingList } from "@/components/readings/ReadingList"
import type { Reading } from "@/mock/db"
import type { components } from "@/lib/api.types"

export const Route = createFileRoute("/patient/dashboard")({
  component: PatientDashboardPage,
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

function PatientDashboardPage() {
  const { data: sessionData } = useSession()
  const user = getAppUser(sessionData)

  const { data } = useQuery({
    queryKey: ["readings"],
    queryFn: () =>
      apiClient.GET("/patients/me/readings", {
        params: { query: { limit: 5 } },
      }),
    enabled: !!user,
  })

  const apiReadings = data?.data?.data ?? []
  const recent = apiReadings.map(adaptReading)
  const alertCount = apiReadings.filter((r) => r.severity !== "normal").length

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const firstName = user?.firstName ?? user?.name?.split(" ")[0] ?? "there"

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-xl font-semibold">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your glucose and blood pressure readings.
        </p>
      </div>

      {alertCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-950/20">
          <CardContent className="flex items-center gap-3 p-4">
            <Badge variant="warning">{alertCount}</Badge>
            <p className="text-sm text-yellow-800 dark:text-yellow-400">
              {alertCount === 1 ? "reading" : "readings"} out of normal range in
              your history.
            </p>
          </CardContent>
        </Card>
      )}

      <Link to="/patient/log">
        <Button size="lg" className="w-full gap-2">
          <RiAddLine className="size-4" />
          Log a reading
        </Button>
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Card className="border-0 bg-transparent p-0 shadow-none">
            <CardHeader className="p-0">
              <CardTitle className="text-sm">Recent readings</CardTitle>
            </CardHeader>
          </Card>
          <Link
            to="/patient/history"
            className="text-xs text-primary underline underline-offset-2"
          >
            View all
          </Link>
        </div>
        <ReadingList
          readings={recent}
          emptyMessage="No readings logged yet. Log your first reading above."
        />
      </div>
    </div>
  )
}
