import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
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
  CardDescription,
} from "@workspace/ui/components/card"
import { RiHeartPulseLine } from "@remixicon/react"
import { patients } from "@/mock/db"
import { setSession } from "@/mock/auth"

export const Route = createFileRoute("/patient/login")({
  component: PatientLoginPage,
})

function PatientLoginPage() {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState(patients[0]?.id ?? "")

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const patient = patients.find((p) => p.id === selectedId)
    if (!patient) return
    setSession({ userId: patient.id, role: "patient", name: patient.name })
    void navigate({ to: "/patient/dashboard" })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <RiHeartPulseLine className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        <p className="text-sm text-muted-foreground">
          Maternal Health Monitoring
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Patient Sign In</CardTitle>
          <CardDescription>
            Select your name to sign in via magic link (demo mode).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem
                    key={p.id}
                    value={p.id}
                    disabled={p.status === "suspended"}
                  >
                    {p.name} {p.status === "suspended" ? "(suspended)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" className="w-full" size="lg">
              Sign in
            </Button>
          </form>
          <div className="mt-4 text-center">
            <a
              href="/doctor/login"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Sign in as a doctor
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
