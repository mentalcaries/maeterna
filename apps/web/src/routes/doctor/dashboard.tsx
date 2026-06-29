import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/card"
import { Badge } from "@/components/badge"
import { apiClient } from "@/lib/api-client"
import { RiAlertLine, RiArrowRightLine } from "@remixicon/react"

export const Route = createFileRoute("/doctor/dashboard")({
  component: DoctorDashboardPage,
})

function DoctorDashboardPage() {
  const { data: patientList = [], isPending } = useQuery({
    queryKey: ["doctor-patients"],
    queryFn: async () => {
      const res = await apiClient.GET("/doctors/me/patients")
      return res.data ?? []
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">My Patients</h1>
        <p className="text-sm text-muted-foreground">
          {isPending ? "Loading…" : `${patientList.length} patients assigned`}
        </p>
      </div>

      {patientList.length === 0 && !isPending ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No patients assigned yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {patientList.map(({ patient, unreadAlertCount, lastReadingAt }) => {
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
                          variant="warning"
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
          })}
        </div>
      )}
    </div>
  )
}
