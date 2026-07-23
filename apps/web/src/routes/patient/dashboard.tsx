import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card"
import { Badge } from "@/components/badge"
import { RiAddLine, RiHeartPulseLine } from "@remixicon/react"
import { useSession } from "@/lib/session"
import { getAppUser } from "@/lib/auth-client"
import { apiClient } from "@/lib/api-client"
import { ReadingList } from "@/components/readings/ReadingList"
import { adaptReading } from "@/lib/readings"
import { computeGestationalAge, formatGestationalAge } from "@/lib/due-date"

export const Route = createFileRoute("/patient/dashboard")({
  component: PatientDashboardPage,
})

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

  const { data: prefsData } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiClient.GET("/preferences"),
    enabled: !!user,
  })

  const { data: profileData } = useQuery({
    queryKey: ["patient-profile"],
    queryFn: async () => {
      const res = await apiClient.GET("/patients/me")
      return res.data ?? null
    },
    enabled: !!user,
  })

  const apiReadings = data?.data?.data ?? []
  const recent = apiReadings.map(adaptReading)
  const alertCount = apiReadings.filter((r) => r.severity === "high").length
  const glucoseUnit =
    (prefsData?.data?.glucoseUnit as "mg/dL" | "mmol/L" | undefined) ?? "mg/dL"

  const gestationalAge = profileData?.dueDate
    ? computeGestationalAge(profileData.dueDate)
    : null

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const firstName = user?.firstName ?? user?.name?.split(" ")[0] ?? "there"

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-2xl font-semibold">
          {greeting}, {firstName}
        </h1>
        <p className="text-base text-muted-foreground">
          Track your glucose and blood pressure readings.
        </p>
      </div>

      {gestationalAge && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <RiHeartPulseLine className="size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Gestational age</p>
              <p className="text-2xl font-semibold">
                {formatGestationalAge(gestationalAge)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {alertCount > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
          <CardContent className="flex items-center gap-3 p-4">
            <Badge variant="critical">{alertCount}</Badge>
            <p className="text-base text-red-800 dark:text-red-400">
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
              <CardTitle className="text-base">Recent readings</CardTitle>
            </CardHeader>
          </Card>
          <Link
            to="/patient/history"
            className="text-sm text-primary underline underline-offset-2"
          >
            View all
          </Link>
        </div>
        <ReadingList
          readings={recent}
          glucoseUnit={glucoseUnit}
          emptyMessage="No readings logged yet. Log your first reading above."
        />
      </div>
    </div>
  )
}
