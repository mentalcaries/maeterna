import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { RiAddLine } from "@remixicon/react"
import { getSession } from "@/mock/auth"
import { getPatientReadings, patients } from "@/mock/db"
import { ReadingList } from "@/components/readings/ReadingList"

export const Route = createFileRoute("/patient/dashboard")({
  component: PatientDashboardPage,
})

function PatientDashboardPage() {
  const session = getSession()
  const patient = patients.find((p) => p.id === session?.userId)
  const allReadings = patient ? getPatientReadings(patient.id) : []
  const recent = allReadings.slice(0, 5)
  const alertCount = allReadings.filter((r) => r.severity !== undefined).length

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-xl font-semibold">
          {greeting}, {patient?.name.split(" ")[0] ?? "there"}
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
