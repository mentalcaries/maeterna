import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router"
import { useEffect } from "react"
import { getSession, clearSession } from "@/mock/auth"
import { Button } from "@workspace/ui/components/button"
import {
  RiHeartPulseLine,
  RiGroupLine,
  RiUserAddLine,
  RiFileListLine,
  RiLogoutBoxLine,
  RiDashboardLine,
} from "@remixicon/react"
import { cn } from "@workspace/ui/lib/utils"

export const Route = createFileRoute("/admin")({ component: AdminLayout })

const NAV = [
  { to: "/admin/dashboard" as const, icon: RiDashboardLine, label: "Overview" },
  { to: "/admin/users" as const, icon: RiGroupLine, label: "Users" },
  { to: "/admin/invite" as const, icon: RiUserAddLine, label: "Invite" },
  { to: "/admin/audit" as const, icon: RiFileListLine, label: "Audit log" },
]

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = getSession()

  const isLoginPage = location.pathname === "/admin/login"

  useEffect(() => {
    if (!isLoginPage) {
      const s = getSession()
      if (!s || s.role !== "admin") {
        void navigate({ to: "/admin/login" })
      }
    }
  }, [navigate, isLoginPage])

  if (isLoginPage) return <Outlet />

  if (!session || session.role !== "admin") return null

  function handleLogout() {
    clearSession()
    void navigate({ to: "/admin/login" })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-52 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <RiHeartPulseLine className="size-4 text-primary" />
          <span className="text-sm font-semibold">Maeterna Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2 pt-3">
          {NAV.map(({ to, icon: Icon, label }) => {
            const active =
              location.pathname === to || location.pathname.startsWith(to + "/")
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 rounded-none px-3 py-2 text-xs font-semibold tracking-wider uppercase transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <RiLogoutBoxLine className="mr-2 size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6 lg:hidden">
          <div className="flex items-center gap-2">
            <RiHeartPulseLine className="size-4 text-primary" />
            <span className="text-sm font-semibold">Maeterna Admin</span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={handleLogout}>
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
                  "flex shrink-0 items-center gap-1.5 rounded-none px-3 py-1.5 text-xs font-semibold tracking-wider uppercase",
                  active ? "text-primary" : "text-muted-foreground"
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
