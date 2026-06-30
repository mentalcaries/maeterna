import {
  createFileRoute,
  Outlet,
  useNavigate,
  Link,
  useLocation,
} from "@tanstack/react-router"
import { useEffect } from "react"
import { useSession } from "@/lib/session"
import { authClient, getAppUser } from "@/lib/auth-client"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/button"
import {
  RiHistoryLine,
  RiAddLine,
  RiLogoutBoxLine,
  RiShieldLine,
  RiSettings3Line,
  RiHomeLine,
} from "@remixicon/react"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/patient")({ component: PatientLayout })

function PatientLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { data: sessionData, isPending } = useSession()

  const isLoginPage = location.pathname === "/patient/login"

  useEffect(() => {
    if (isPending || isLoginPage) return
    const user = getAppUser(sessionData)
    if (!user || user.role !== "patient") {
      void navigate({ to: "/" })
    }
  }, [sessionData, isPending, navigate, isLoginPage])

  if (isLoginPage) return <Outlet />
  if (isPending) return null

  const user = getAppUser(sessionData)
  if (!user || user.role !== "patient") return null

  function handleLogout() {
    void authClient.signOut().then(() => {
      queryClient.removeQueries({ queryKey: ["session"] })
      void navigate({ to: "/login" })
    })
  }

  const navItems = [
    {
      to: "/patient/dashboard" as const,
      icon: RiHomeLine,
      label: "Home",
    },
    { to: "/patient/log" as const, icon: RiAddLine, label: "Log" },
    { to: "/patient/history" as const, icon: RiHistoryLine, label: "History" },
    { to: "/patient/access" as const, icon: RiShieldLine, label: "Access" },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4 md:h-16 md:max-w-4xl md:px-6">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Maeterna"
              className="size-10 rounded-full"
            />
            <span className="text-sm font-semibold tracking-wide">
              Maeterna
            </span>
          </div>

          {/* Desktop inline nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ to, icon: Icon, label }) => {
              const active = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/8 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-1">
            <Link
              to="/patient/settings"
              className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Account settings"
            >
              <RiSettings3Line className="size-5 md:size-6" />
            </Link>
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <RiLogoutBoxLine className="size-5 md:size-6" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto w-full max-w-lg">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:hidden">
        <div className="mx-auto flex h-16 w-full max-w-lg items-center justify-around">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "size-6",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
