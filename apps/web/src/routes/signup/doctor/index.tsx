import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
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
import { authClient, getAppUser } from "@/lib/auth-client"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/signup/doctor/")({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    const user = getAppUser(session)

    if (!user) throw redirect({ to: "/login" })
    if (!user.role) throw redirect({ to: "/signup/select-role" })
    if (user.role !== "doctor") throw redirect({ to: "/" })
    if (user.firstName) {
      throw redirect({
        to:
          user.status === "pending_verification"
            ? "/signup/doctor/pending"
            : "/doctor/dashboard",
      })
    }
  },
  component: DoctorProfilePage,
})

function DoctorProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [profileError, setProfileError] = useState("")

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
        void navigate({ to: "/signup/doctor/pending" })
      } else {
        void navigate({ to: "/signup/doctor/affiliations" })
      }
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileError("")
    if (!firstName.trim()) {
      setProfileError("First name is required.")
      return
    }
    if (!lastName.trim()) {
      setProfileError("Last name is required.")
      return
    }
    if (!registrationNumber.trim()) {
      setProfileError("MBTT Member ID is required.")
      return
    }
    profileMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      registrationNumber: registrationNumber.trim(),
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background px-6 pt-[12vh] pb-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-28 items-center justify-center rounded-full">
          <img src="/logo.png" alt="Maeterna" className="rounded-full" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        <p className="text-sm text-muted-foreground">
          Step 1 of 2 — Profile &amp; verification
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Profile &amp; registration</CardTitle>
          <CardDescription className="text-base">
            Enter your name and MBTT Member ID.
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
                  autoComplete="given-name"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg">MBTT Member ID</Label>
              <Input
                id="reg"
                placeholder="e.g. 10284"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                autoComplete="off"
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">
                Your numeric member ID as listed on the MBTT national registry.
              </p>
            </div>

            {(profileError || profileMutation.isError) && (
              <p className="text-sm text-destructive">
                {profileError || "Something went wrong. Please try again."}
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
