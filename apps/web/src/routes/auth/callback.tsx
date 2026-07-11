import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { getAppUser } from "@/lib/auth-client"
import { useSession } from "@/lib/session"

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: CallbackPage,
})

function CallbackPage() {
  const navigate = useNavigate()
  const { error } = Route.useSearch()
  const { data: sessionData, isPending } = useSession()

  useEffect(() => {
    if (error) {
      void navigate({ to: "/login", search: { error } })
      return
    }
    if (isPending) return

    const user = getAppUser(sessionData)

    if (!user) {
      void navigate({ to: "/login" })
      return
    }
    if (!user.role) {
      void navigate({ to: "/signup/select-role" })
      return
    }

    if (user.role === "patient") {
      if (!user.firstName) {
        void navigate({ to: "/signup/patient" })
        return
      }
      void navigate({ to: "/patient/dashboard" })
      return
    }
    if (user.role === "doctor") {
      if (!user.firstName) {
        void navigate({ to: "/signup/doctor" })
        return
      }
      void navigate({ to: "/doctor/dashboard" })
      return
    }
    if (user.role === "admin") {
      void navigate({ to: "/admin/dashboard" })
      return
    }

    void navigate({ to: "/" })
  }, [error, isPending, navigate, sessionData])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  )
}
