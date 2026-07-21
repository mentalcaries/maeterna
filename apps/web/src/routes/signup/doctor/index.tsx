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
import { isValidPhoneNumber } from "@/lib/phone"

export const Route = createFileRoute("/signup/doctor/")({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    const user = getAppUser(session)

    if (!user) throw redirect({ to: "/login" })
    if (!user.role) throw redirect({ to: "/signup/select-role" })
    if (user.role !== "doctor") throw redirect({ to: "/" })
    if (user.firstName) {
      throw redirect({ to: "/doctor/dashboard" })
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
  const [phoneNumber, setPhoneNumber] = useState("")
  const [profileError, setProfileError] = useState("")

  const profileMutation = useMutation({
    mutationFn: (body: {
      firstName: string
      lastName: string
      registrationNumber: string
      phoneNumber: string
    }) => apiClient.POST("/profile/complete", { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["session"] })
      void navigate({ to: "/signup/doctor/affiliations" })
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
      setProfileError("Medical registration number is required.")
      return
    }
    if (!phoneNumber.trim()) {
      setProfileError("Phone number is required.")
      return
    }
    if (!isValidPhoneNumber(phoneNumber.trim())) {
      setProfileError("Enter a valid phone number.")
      return
    }
    profileMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      registrationNumber: registrationNumber.trim(),
      phoneNumber: phoneNumber.trim(),
    })
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-start bg-background px-6 pt-[12vh] pb-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-28 items-center justify-center rounded-full">
          <img src="/logo.png" alt="Maeterna" className="rounded-full" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        <p className="text-sm text-muted-foreground">
          Step 1 of 2 — Profile &amp; registration
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Profile &amp; registration</CardTitle>
          <CardDescription className="text-base">
            Tell patients who you are so they can verify your registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label
                  htmlFor="firstName"
                  className="text-base font-medium tracking-normal normal-case"
                >
                  First name
                </Label>
                <Input
                  id="firstName"
                  className="text-base"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label
                  htmlFor="lastName"
                  className="text-base font-medium tracking-normal normal-case"
                >
                  Last name
                </Label>
                <Input
                  id="lastName"
                  className="text-base"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              <Label
                htmlFor="registrationNumber"
                className="text-base font-medium tracking-normal normal-case"
              >
                Medical registration number
              </Label>
              <Input
                id="registrationNumber"
                className="text-base"
                placeholder="Registration number"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Shown to patients so they can verify your registration.
              </p>
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              <Label
                htmlFor="phoneNumber"
                className="text-base font-medium tracking-normal normal-case"
              >
                Phone number
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                className="text-base"
                placeholder="Phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                autoComplete="tel"
              />
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
              {profileMutation.isPending ? "Saving…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
