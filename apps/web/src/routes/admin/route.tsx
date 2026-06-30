import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router"
import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/button"
import { cn } from "@/lib/utils"
import {
  RiGroupLine,
  RiUserAddLine,
  RiFileListLine,
  RiLogoutBoxLine,
  RiDashboardLine,
  RiTimeLine,
  RiRefreshLine,
} from "@remixicon/react"
import { useSession } from "@/lib/session"
import { getAppUser, authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/admin")({ component: AdminLayout })

const NAV = [
  {
    to: "/admin/dashboard" as const,
    icon: RiDashboardLine,
    label: "Dashboard",
  },
  { to: "/admin/users" as const, icon: RiGroupLine, label: "Users" },
  {
    to: "/admin/pending" as const,
    icon: RiTimeLine,
    label: "Pending Approvals",
  },
  { to: "/admin/invite" as const, icon: RiUserAddLine, label: "Invite" },
  {
    to: "/admin/audit-log" as const,
    icon: RiFileListLine,
    label: "Audit Log",
  },
  { to: "/admin/sync" as const, icon: RiRefreshLine, label: "MBTT Sync" },
]

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { data: sessionData, isPending } = useSession()
  const user = getAppUser(sessionData)

  useEffect(() => {
    if (isPending) return
    if (!user || user.role !== "admin") {
      void navigate({ to: "/" })
    }
  }, [sessionData, isPending, navigate, user])

  if (isPending) return null
  if (!user || user.role !== "admin") return null

  function handleSignOut() {
    void authClient.signOut().then(() => {
      queryClient.removeQueries({ queryKey: ["session"] })
      void navigate({ to: "/login" })
    })
  }

  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user.name

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-56 flex-col border-r border-border bg-card pb-10 lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <img
            src="/logo.png"
            alt="Maeterna"
            className="size-10 rounded-full"
          />
          <span className="text-sm font-semibold">Maeterna Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2 pt-3">
          {NAV.map(({ to, icon: Icon, label }) => {
            const active =
              location.pathname === to || location.pathname.startsWith(to + "/")
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-border p-3">
          <p className="mb-2 truncate px-2 text-sm text-muted-foreground">
            {displayName}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            <RiLogoutBoxLine className="mr-2 size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6 lg:hidden">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Maeterna"
              className="size-10 rounded-full"
            />
            <span className="text-sm font-semibold">Maeterna Admin</span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={handleSignOut}>
            <RiLogoutBoxLine />
          </Button>
        </header>
        <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2 lg:hidden">
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded px-3 py-1.5 text-xs",
                  active ? "font-medium text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            )
          })}
        </div>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
