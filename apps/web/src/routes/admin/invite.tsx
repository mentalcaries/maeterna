import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/admin/invite")({
  component: AdminInvitePage,
})

function AdminInvitePage() {
  const [role, setRole] = useState<"patient" | "doctor">("patient")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [successEmail, setSuccessEmail] = useState<string | null>(null)

  const inviteMutation = useMutation({
    mutationFn: (body: {
      email: string
      role: "patient" | "doctor"
      name?: string
    }) => apiClient.POST("/admin/invites", { body }),
    onSuccess: (_, vars) => {
      setSuccessEmail(vars.email)
      setName("")
      setEmail("")
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSuccessEmail(null)
    inviteMutation.mutate({
      email: email.trim(),
      role,
      name: name.trim() || undefined,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Invite</h1>
        <p className="text-sm text-muted-foreground">
          Send an invitation to a new patient or doctor.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-sm">New invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <div className="flex gap-3">
                {(["patient", "doctor"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 rounded-md border-2 py-2 text-sm font-medium capitalize transition-colors ${
                      role === r
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">
                Name <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
              />
            </div>

            {inviteMutation.isError && (
              <p className="text-sm text-destructive">
                Failed to send invite. Please try again.
              </p>
            )}

            {successEmail && (
              <p className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                Invite sent to {successEmail}.
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? "Sending…" : "Send invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
