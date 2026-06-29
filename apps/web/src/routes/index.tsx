import { createFileRoute, redirect } from "@tanstack/react-router"
import { authClient, getAppUser } from "@/lib/auth-client"

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    const user = getAppUser(session)

    if (!user) throw redirect({ to: "/login" })

    if (!user.role) throw redirect({ to: "/signup/select-role" })

    if (!user.firstName) {
      if (user.role === "patient") throw redirect({ to: "/signup/patient" })
      if (user.role === "doctor") throw redirect({ to: "/signup/doctor" })
    }

    if (user.role === "patient") throw redirect({ to: "/patient/dashboard" })
    if (user.role === "doctor") throw redirect({ to: "/doctor/dashboard" })
    throw redirect({ to: "/admin/dashboard" })
  },
  component: () => null,
})
