import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router"
import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSession } from "@/lib/session"
import { authClient, getAppUser } from "@/lib/auth-client"
import { Button } from "@/components/button"
import { RiGroupLine, RiLogoutBoxLine, RiSettings3Line } from "@remixicon/react"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/doctor")({ component: DoctorLayout })

const EXCLUDED_PATHS = [
  "/doctor/login",
  "/doctor/onboarding",
  "/doctor/pending",
]

function DoctorLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { data: sessionData, isPending } = useSession()

  const isExcluded = EXCLUDED_PATHS.includes(location.pathname)

  useEffect(() => {
    if (isExcluded || isPending) return

    const user = getAppUser(sessionData)
    if (!user || user.role !== "doctor") {
      void navigate({ to: "/" })
      return
    }

    if (!user.firstName) {
      void navigate({ to: "/signup/doctor" })
      return
    }

    if (user.status === "pending_verification") {
      void navigate({ to: "/signup/doctor/pending" })
    }
  }, [sessionData, isPending, navigate, isExcluded])

  if (isExcluded) return <Outlet />
  if (isPending) return null

  const user = getAppUser(sessionData)
  if (!user || user.role !== "doctor") return null

  function handleLogout() {
    void authClient.signOut().then(() => {
      queryClient.removeQueries({ queryKey: ["session"] })
      void navigate({ to: "/login" })
    })
  }

  const isPatientsActive =
    location.pathname.startsWith("/doctor/dashboard") ||
    location.pathname === "/doctor"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:h-16 md:px-6">
          <Link
            to="/doctor/dashboard"
            className="flex items-center gap-2 text-foreground hover:opacity-80"
          >
            <img
              src="/logo.png"
              alt="Maeterna"
              className="size-10 rounded-full"
            />
            <span className="text-base font-semibold tracking-wide">
              Maeterna
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/doctor/dashboard"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isPatientsActive
                  ? "bg-primary/8 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <RiGroupLine className="size-4" />
              Patients
            </Link>
            <Link
              to="/doctor/settings"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                location.pathname.startsWith("/doctor/settings")
                  ? "bg-primary/8 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <RiSettings3Line className="size-4" />
              Settings
            </Link>
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <RiLogoutBoxLine className="size-5" />
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Signed in as {user.firstName} {user.lastName ?? ""}
          </p>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
