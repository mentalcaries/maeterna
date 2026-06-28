import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { getSession } from "@/mock/auth"

export const Route = createFileRoute("/")({ component: IndexPage })

function IndexPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const session = getSession()
    if (!session) {
      void navigate({ to: "/patient/login" })
      return
    }
    if (session.role === "doctor") void navigate({ to: "/doctor/dashboard" })
    else if (session.role === "admin") void navigate({ to: "/admin/dashboard" })
    else void navigate({ to: "/patient/dashboard" })
  }, [navigate])

  return null
}
