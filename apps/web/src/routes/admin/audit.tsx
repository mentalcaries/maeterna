import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/audit")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/audit-log" })
  },
  component: () => null,
})
