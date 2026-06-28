import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

export const Route = createFileRoute("/doctor/login")({
  component: DoctorLoginRedirect,
})

function DoctorLoginRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    void navigate({ to: "/login" })
  }, [navigate])
  return null
}
