import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { patients, doctors, readings } from "@/mock/db"
import { RiGroupLine, RiStethoscopeLine, RiAlertLine } from "@remixicon/react"

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  const suspended = [...patients, ...doctors].filter(
    (u) => u.status === "suspended"
  )
  const alertReadings = readings.filter((r) => r.severity !== undefined)

  const stats = [
    {
      label: "Patients",
      value: patients.length,
      sub: `${suspended.filter((u) => u.role === "patient").length} suspended`,
      icon: RiGroupLine,
      href: "/admin/users",
    },
    {
      label: "Doctors",
      value: doctors.length,
      sub: `${suspended.filter((u) => u.role === "doctor").length} suspended`,
      icon: RiStethoscopeLine,
      href: "/admin/users",
    },
    {
      label: "Flagged readings",
      value: alertReadings.length,
      sub: `${alertReadings.filter((r) => r.severity === "critical").length} critical`,
      icon: RiAlertLine,
      href: "/admin/users",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">System summary</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} to={s.href as "/admin/users"}>
            <Card className="transition-colors hover:bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {s.label}
                </CardTitle>
                <s.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{s.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link
            to="/admin/invite"
            className="rounded-none border border-border px-4 py-2 text-xs font-semibold tracking-wider uppercase transition-colors hover:bg-muted"
          >
            Invite user
          </Link>
          <Link
            to="/admin/users"
            className="rounded-none border border-border px-4 py-2 text-xs font-semibold tracking-wider uppercase transition-colors hover:bg-muted"
          >
            Manage users
          </Link>
          <Link
            to="/admin/audit"
            className="rounded-none border border-border px-4 py-2 text-xs font-semibold tracking-wider uppercase transition-colors hover:bg-muted"
          >
            View audit log
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
