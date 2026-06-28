import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

export const Route = createFileRoute("/patient/login")({
  component: PatientLoginRedirect,
})

function PatientLoginRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    void navigate({ to: "/login" })
  }, [navigate])
  return null
}
