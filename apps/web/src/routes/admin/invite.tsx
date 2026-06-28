import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { doctors, inviteUser, addAuditEntry } from "@/mock/db"
import { getSession } from "@/mock/auth"

export const Route = createFileRoute("/admin/invite")({
  component: AdminInvitePage,
})

function AdminInvitePage() {
  const session = getSession()
  const [role, setRole] = useState<"patient" | "doctor">("patient")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "")
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess(null)

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.")
      return
    }

    const newUser = inviteUser(
      role,
      name.trim(),
      email.trim(),
      role === "patient" ? doctorId : undefined
    )

    if (session) {
      addAuditEntry({
        actorId: session.userId,
        actorName: session.name,
        action: `Invited ${role}`,
        targetId: newUser.id,
        targetName: newUser.name,
        timestamp: new Date().toISOString(),
      })
    }

    setSuccess(`${newUser.name} has been added as a ${role}.`)
    setName("")
    setEmail("")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Invite user</h1>
        <p className="text-sm text-muted-foreground">
          Add a new patient or doctor to Maeterna.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-sm">New invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "patient" | "doctor")}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            {role === "patient" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="doctor">Assign to doctor</Label>
                <Select value={doctorId} onValueChange={setDoctorId}>
                  <SelectTrigger id="doctor">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <Badge variant="success">{success}</Badge>}

            <Button type="submit" className="w-full">
              Send invitation
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
