import { createFileRoute, Link } from "@tanstack/react-router"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { getSession } from "@/mock/auth"
import { patients, readings } from "@/mock/db"
import { RiAlertLine, RiArrowRightLine } from "@remixicon/react"

export const Route = createFileRoute("/doctor/dashboard")({
  component: DoctorDashboardPage,
})

function DoctorDashboardPage() {
  const session = getSession()
  const myPatients = patients.filter((p) => p.doctorId === session?.userId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">My Patients</h1>
        <p className="text-sm text-muted-foreground">
          {myPatients.length} patients assigned
        </p>
      </div>

      {myPatients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No patients assigned yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myPatients.map((patient) => {
            const patientReadings = readings.filter(
              (r) => r.patientId === patient.id
            )
            const alerts = patientReadings.filter(
              (r) => r.severity !== undefined
            )
            const criticals = patientReadings.filter(
              (r) => r.severity === "critical"
            )
            const lastReading = patientReadings.sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            )[0]

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
                        <span className="font-medium">{patient.name}</span>
                        {patient.status === "suspended" && (
                          <Badge variant="destructive">Suspended</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {lastReading
                          ? `Last reading: ${new Date(lastReading.timestamp).toLocaleDateString("en-TT", { month: "short", day: "numeric" })}`
                          : "No readings yet"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {criticals.length > 0 && (
                        <Badge
                          variant="critical"
                          className="flex items-center gap-1"
                        >
                          <RiAlertLine className="size-3" />
                          {criticals.length}
                        </Badge>
                      )}
                      {alerts.length > 0 && criticals.length === 0 && (
                        <Badge variant="warning">{alerts.length}</Badge>
                      )}
                      <RiArrowRightLine className="size-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
