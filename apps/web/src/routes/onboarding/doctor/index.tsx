import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/button"
import { Input } from "@/components/input"
import { Label } from "@/components/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/card"
import { RiHeartPulseLine, RiCheckLine } from "@remixicon/react"
import { apiClient } from "@/lib/api-client"
import { useSession } from "@/lib/session"
import { getAppUser } from "@/lib/auth-client"

export const Route = createFileRoute("/onboarding/doctor/")({
  component: DoctorOnboardingStep1,
})

function DoctorOnboardingStep1() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: sessionData } = useSession()
  const user = getAppUser(sessionData)

  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.lastName ?? "")
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [error, setError] = useState("")

  const profileMutation = useMutation({
    mutationFn: (body: {
      firstName: string
      lastName: string
      registrationNumber: string
    }) => apiClient.POST("/profile/complete", { body }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["session"] })
      const profile = res.data
      if (!profile) return
      if ("status" in profile && profile.status === "pending_verification") {
        void navigate({ to: "/onboarding/doctor/pending" })
      } else {
        void navigate({ to: "/onboarding/doctor/affiliations" })
      }
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!firstName.trim()) {
      setError("First name is required.")
      return
    }
    if (!lastName.trim()) {
      setError("Last name is required.")
      return
    }
    if (!registrationNumber.trim()) {
      setError("Please enter your MBTT registration number.")
      return
    }
    profileMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      registrationNumber: registrationNumber.trim().toUpperCase(),
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <RiHeartPulseLine className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        <p className="text-sm text-muted-foreground">
          Welcome. Let's get you set up.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        {([1, 2] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                s === 1
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s === 1 ? <RiCheckLine className="size-3.5" /> : s}
            </div>
            <span
              className={`text-xs ${s === 1 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {s === 1 ? "Registration" : "Institution"}
            </span>
            {s < 2 && <span className="text-muted-foreground/50">—</span>}
          </div>
        ))}
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Profile &amp; registration</CardTitle>
          <CardDescription>
            Enter your name and MBTT registration number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg">MBTT registration number</Label>
              <Input
                id="reg"
                placeholder="e.g. MBTT-2847"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                autoComplete="off"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {profileMutation.isError && (
              <p className="text-sm text-destructive">
                Something went wrong. Please try again.
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={profileMutation.isPending}
            >
              {profileMutation.isPending ? "Verifying…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
