import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/button"
import { Input } from "@/components/input"
import { Label } from "@/components/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { isValidPhoneNumber } from "@/lib/phone"
import { AffiliationManager } from "@/components/doctor/AffiliationManager"

export const Route = createFileRoute("/doctor/settings")({
  component: DoctorSettingsPage,
})

function DoctorSettingsPage() {
  const queryClient = useQueryClient()

  const { data: doctor, isLoading } = useQuery({
    queryKey: ["doctor-me"],
    queryFn: async () => {
      const res = await apiClient.GET("/doctors/me")
      return res.data ?? null
    },
  })

  const [initialized, setInitialized] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [profileError, setProfileError] = useState("")
  const [profileSuccess, setProfileSuccess] = useState(false)

  const [unitSuccess, setUnitSuccess] = useState(false)

  const { data: prefsData } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiClient.GET("/preferences"),
  })

  const glucoseUnit =
    (prefsData?.data?.glucoseUnit as "mg/dL" | "mmol/L" | undefined) ?? "mg/dL"

  const unitMutation = useMutation({
    mutationFn: (unit: "mg/dL" | "mmol/L") =>
      apiClient.PATCH("/preferences", { body: { glucoseUnit: unit } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["preferences"] })
      setUnitSuccess(true)
      setTimeout(() => setUnitSuccess(false), 2000)
    },
  })

  useEffect(() => {
    if (doctor && !initialized) {
      setFirstName(doctor.firstName ?? "")
      setLastName(doctor.lastName ?? "")
      setRegistrationNumber(doctor.registrationNumber ?? "")
      setPhoneNumber(doctor.phoneNumber ?? "")
      setInitialized(true)
    }
  }, [doctor, initialized])

  const patchProfile = useMutation({
    mutationFn: (body: {
      firstName: string
      lastName: string
      registrationNumber?: string
      phoneNumber: string
    }) => apiClient.PATCH("/doctors/me", { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["doctor-me"] })
      void queryClient.invalidateQueries({ queryKey: ["session"] })
      setProfileSuccess(true)
    },
  })

  const registrationNumberSet = !!doctor?.registrationNumber

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileError("")
    setProfileSuccess(false)
    if (!firstName.trim()) {
      setProfileError("First name is required.")
      return
    }
    if (!lastName.trim()) {
      setProfileError("Last name is required.")
      return
    }
    if (!registrationNumberSet && !registrationNumber.trim()) {
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
    patchProfile.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ...(registrationNumberSet
        ? {}
        : { registrationNumber: registrationNumber.trim() }),
      phoneNumber: phoneNumber.trim(),
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-base text-muted-foreground">
          Manage your profile and affiliations.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-base text-muted-foreground">Loading…</p>
          ) : (
            <form
              onSubmit={handleProfileSubmit}
              className="flex flex-col gap-4"
            >
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
                    onChange={(e) => {
                      setFirstName(e.target.value)
                      setProfileSuccess(false)
                    }}
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
                    onChange={(e) => {
                      setLastName(e.target.value)
                      setProfileSuccess(false)
                    }}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-1.5">
                <Label className="text-base font-medium tracking-normal normal-case">
                  Medical registration number
                </Label>
                {registrationNumberSet ? (
                  <p className="text-base">{doctor?.registrationNumber}</p>
                ) : (
                  <>
                    <Input
                      id="registrationNumber"
                      className="text-base"
                      placeholder="Registration number"
                      value={registrationNumber}
                      onChange={(e) => {
                        setRegistrationNumber(e.target.value)
                        setProfileSuccess(false)
                      }}
                    />
                    <p className="text-sm text-muted-foreground">
                      Shown to patients so they can verify your registration.
                    </p>
                  </>
                )}
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
                  onChange={(e) => {
                    setPhoneNumber(e.target.value)
                    setProfileSuccess(false)
                  }}
                  autoComplete="tel"
                />
              </div>

              {profileError && (
                <p className="text-sm text-destructive">{profileError}</p>
              )}
              {patchProfile.isError && !profileError && (
                <p className="text-sm text-destructive">
                  Failed to save profile. Please try again.
                </p>
              )}
              {profileSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Profile updated.
                </p>
              )}

              <Button
                type="submit"
                className="self-start"
                disabled={patchProfile.isPending}
              >
                {patchProfile.isPending ? "Saving…" : "Save changes"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Affiliations */}
      <Card>
        <CardHeader>
          <CardTitle>Affiliations</CardTitle>
        </CardHeader>
        <CardContent>
          <AffiliationManager />
        </CardContent>
      </Card>

      {/* Units */}
      <Card>
        <CardHeader>
          <CardTitle>Units</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-base text-muted-foreground">Blood glucose unit</p>
          <div className="flex gap-2">
            {(["mg/dL", "mmol/L"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => unitMutation.mutate(u)}
                className={cn(
                  "rounded-md border-2 px-4 py-2 text-sm font-medium transition-colors",
                  glucoseUnit === u
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground/40"
                )}
              >
                {u}
              </button>
            ))}
          </div>
          {unitSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Preference saved.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
