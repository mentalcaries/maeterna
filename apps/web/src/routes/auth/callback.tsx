import { createFileRoute, redirect } from "@tanstack/react-router"
import { authClient, getAppUser } from "@/lib/auth-client"

export const Route = createFileRoute("/auth/callback")({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    const user = getAppUser(session)

    if (!user) throw redirect({ to: "/" })

    if (!user.firstName) {
      if (user.role === "patient") throw redirect({ to: "/signup/patient" })
      if (user.role === "doctor") throw redirect({ to: "/signup/doctor" })
    }

    if (user.role === "patient") throw redirect({ to: "/patient/dashboard" })
    if (user.role === "doctor") throw redirect({ to: "/doctor/dashboard" })
    if (user.role === "admin") throw redirect({ to: "/admin/dashboard" })

    throw redirect({ to: "/" })
  },
  component: () => null,
})
