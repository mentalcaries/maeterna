import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { RiErrorWarningLine } from "@remixicon/react"
import { authClient, getAppUser } from "@/lib/auth-client"

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: CallbackPage,
})

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_TOKEN: "This sign-in link is invalid. It may have already been used.",
  TOKEN_EXPIRED: "This sign-in link has expired. Please request a new one.",
  MAGIC_LINK_EXPIRED:
    "This sign-in link has expired. Please request a new one.",
}

function CallbackPage() {
  const navigate = useNavigate()
  const { error } = Route.useSearch()

  useEffect(() => {
    if (error) return

    authClient
      .getSession()
      .then((session) => {
        const user = getAppUser(session)

        if (!user) {
          void navigate({ to: "/login" })
          return
        }
        if (!user.role) {
          void navigate({ to: "/signup/select-role" })
          return
        }

        if (!user.firstName) {
          if (user.role === "patient") {
            void navigate({ to: "/signup/patient" })
            return
          }
          if (user.role === "doctor") {
            void navigate({ to: "/signup/doctor" })
            return
          }
        }

        if (user.role === "patient") {
          void navigate({ to: "/patient/dashboard" })
          return
        }
        if (user.role === "doctor") {
          void navigate({ to: "/doctor/dashboard" })
          return
        }
        if (user.role === "admin") {
          void navigate({ to: "/admin/dashboard" })
          return
        }

        void navigate({ to: "/" })
      })
      .catch(() => {
        void navigate({ to: "/login" })
      })
  }, [error, navigate])

  if (error) {
    const message =
      ERROR_MESSAGES[error] ??
      "Something went wrong with your sign-in link. Please try again."

    return (
      <div className="flex min-h-screen flex-col items-center justify-start bg-background px-6 pt-[12vh] pb-12">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex size-28 items-center justify-center rounded-full">
            <img src="/logo.png" alt="Maeterna" className="rounded-full" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        </div>

        <div className="w-full max-w-sm rounded-lg border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex gap-3">
            <RiErrorWarningLine className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="flex flex-col gap-3">
              <p className="text-base font-medium text-destructive">
                Sign-in failed
              </p>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Link
                to="/login"
                className="text-sm font-medium text-foreground underline underline-offset-2 hover:text-muted-foreground"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  )
}
