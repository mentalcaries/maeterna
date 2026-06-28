import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router"
import { useEffect } from "react"
import { getSession, clearSession } from "@/mock/auth"
import { doctors } from "@/mock/db"
import { Button } from "@workspace/ui/components/button"
import {
  RiHeartPulseLine,
  RiGroupLine,
  RiLogoutBoxLine,
} from "@remixicon/react"
import { cn } from "@workspace/ui/lib/utils"

export const Route = createFileRoute("/doctor")({ component: DoctorLayout })

const EXCLUDED_PATHS = [
  "/doctor/login",
  "/doctor/onboarding",
  "/doctor/pending",
]

function DoctorLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = getSession()

  const isExcluded = EXCLUDED_PATHS.includes(location.pathname)

  useEffect(() => {
    if (isExcluded) return

    const s = getSession()
    if (!s || s.role !== "doctor") {
      void navigate({ to: "/doctor/login" })
      return
    }

    const doctor = doctors.find((d) => d.id === s.userId)
    if (doctor?.pendingVerification && !doctor.mbttVerified) {
      void navigate({ to: "/doctor/pending" })
      return
    }
    if (!doctor?.onboardingComplete) {
      void navigate({ to: "/doctor/onboarding" })
    }
  }, [navigate, isExcluded])

  if (isExcluded) return <Outlet />

  if (!session || session.role !== "doctor") return null

  function handleLogout() {
    clearSession()
    void navigate({ to: "/doctor/login" })
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
            Signed in as {session.name}
          </span>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
