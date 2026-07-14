import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useQueries } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card"
import {
  RiGroupLine,
  RiStethoscopeLine,
  RiUserForbidLine,
} from "@remixicon/react"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  const navigate = useNavigate()

  const [patients, doctors, suspended] = useQueries({
    queries: [
      {
        queryKey: ["admin-count", "patient"] as const,
        queryFn: async () => {
          const res = await apiClient.GET("/admin/users", {
            params: { query: { role: "patient", limit: 1 } },
          })
          return res.data?.total ?? 0
        },
      },
      {
        queryKey: ["admin-count", "doctor"] as const,
        queryFn: async () => {
          const res = await apiClient.GET("/admin/users", {
            params: { query: { role: "doctor", limit: 1 } },
          })
          return res.data?.total ?? 0
        },
      },
      {
        queryKey: ["admin-count", "suspended"] as const,
        queryFn: async () => {
          const res = await apiClient.GET("/admin/users", {
            params: { query: { status: "suspended", limit: 1 } },
          })
          return res.data?.total ?? 0
        },
      },
    ],
  })

  const stats = [
    {
      label: "Total Patients",
      value: patients.data ?? "—",
      icon: RiGroupLine,
      filterRole: "patient" as const,
      filterStatus: undefined,
    },
    {
      label: "Total Doctors",
      value: doctors.data ?? "—",
      icon: RiStethoscopeLine,
      filterRole: "doctor" as const,
      filterStatus: undefined,
    },
    {
      label: "Suspended Accounts",
      value: suspended.data ?? "—",
      icon: RiUserForbidLine,
      filterRole: undefined,
      filterStatus: "suspended" as const,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const params = new URLSearchParams()
          if (s.filterRole) params.set("role", s.filterRole)
          if (s.filterStatus) params.set("status", s.filterStatus)
          return (
            <button
              key={s.label}
              type="button"
              onClick={() =>
                void navigate({
                  to: "/admin/users",
                  search: {
                    role: s.filterRole ?? "all",
                    status: s.filterStatus ?? "all",
                  },
                })
              }
              className="text-left"
            >
              <Card className="h-full transition-colors hover:bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {s.label}
                  </CardTitle>
                  <s.icon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{s.value}</div>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link
            to="/admin/invite"
            className="rounded border border-border px-4 py-2 text-xs font-semibold tracking-wider uppercase transition-colors hover:bg-muted"
          >
            Invite user
          </Link>
          <Link
            to="/admin/audit-log"
            className="rounded border border-border px-4 py-2 text-xs font-semibold tracking-wider uppercase transition-colors hover:bg-muted"
          >
            View audit log
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
