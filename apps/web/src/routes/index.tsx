import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { useSession } from "@/lib/session"
import { getAppUser } from "@/lib/auth-client"

export const Route = createFileRoute("/")({ component: IndexPage })

function IndexPage() {
  const navigate = useNavigate()
  const { data: sessionData, isPending } = useSession()

  useEffect(() => {
    if (isPending) return
    const user = getAppUser(sessionData)
    if (!user) {
      void navigate({ to: "/login" })
      return
    }
    if (user.role === "doctor") void navigate({ to: "/doctor/dashboard" })
    else if (user.role === "admin") void navigate({ to: "/admin/dashboard" })
    else void navigate({ to: "/patient/dashboard" })
  }, [sessionData, isPending, navigate])

  return null
}
