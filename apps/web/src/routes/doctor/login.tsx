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
import { doctors } from "@/mock/db"
import { setSession } from "@/mock/auth"

export const Route = createFileRoute("/doctor/login")({
  component: DoctorLoginPage,
})

function DoctorLoginPage() {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState(doctors[0]?.id ?? "")

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const doctor = doctors.find((d) => d.id === selectedId)
    if (!doctor) return
    setSession({ userId: doctor.id, role: "doctor", name: doctor.name })

    if (doctor.pendingVerification && !doctor.mbttVerified) {
      void navigate({ to: "/doctor/pending" })
    } else if (!doctor.onboardingComplete) {
      void navigate({ to: "/doctor/onboarding" })
    } else {
      void navigate({ to: "/doctor/dashboard" })
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <RiHeartPulseLine className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        <p className="text-sm text-muted-foreground">Doctor Dashboard</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Doctor Sign In</CardTitle>
          <CardDescription>
            Select your name to sign in (demo mode).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                    {!d.onboardingComplete ? " (setup required)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
          <div className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground">
            <a
              href="/patient/login"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Patient portal
            </a>
            <a
              href="/admin/login"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Admin
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
