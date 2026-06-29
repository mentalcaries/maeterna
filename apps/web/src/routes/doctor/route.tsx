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
import {
  RiHeartPulseLine,
  RiGroupLine,
  RiLogoutBoxLine,
} from "@remixicon/react"
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
      void navigate({ to: "/onboarding/doctor" })
      return
    }

    if (user.status === "pending_verification") {
      void navigate({ to: "/onboarding/doctor/pending" })
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <RiHeartPulseLine className="size-5 text-primary" />
            <span className="text-sm font-semibold tracking-wide">
              Maeterna
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Doctor Dashboard
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              to="/doctor/dashboard"
              className={cn(
                "rounded-none px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors",
                location.pathname.startsWith("/doctor/dashboard") ||
                  location.pathname === "/doctor"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <RiGroupLine className="mr-1 inline size-3.5" />
              Patients
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <RiLogoutBoxLine />
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Signed in as {user.firstName} {user.lastName ?? ""}
          </span>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
