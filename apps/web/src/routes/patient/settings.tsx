import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/button"
import { Input } from "@/components/input"
import { Label } from "@/components/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/popover"
import { Calendar } from "@/components/calendar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog"
import { RiCalendarLine, RiShieldLine } from "@remixicon/react"
import { authClient } from "@/lib/auth-client"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/patient/settings")({
  component: PatientSettingsPage,
})

function parseDateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function PatientSettingsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ["patient-profile"],
    queryFn: async () => {
      const res = await apiClient.GET("/patients/me")
      return res.data ?? null
    },
  })

  const [initialized, setInitialized] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dob, setDob] = useState<Date | undefined>(undefined)
  const [dobOpen, setDobOpen] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [profileSuccess, setProfileSuccess] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
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
    if (profile && !initialized) {
      setFirstName(profile.firstName ?? "")
      setLastName(profile.lastName ?? "")
      if (profile.dateOfBirth) {
        setDob(parseDateString(profile.dateOfBirth))
      }
      setInitialized(true)
    }
  }, [profile, initialized])

  const updateMutation = useMutation({
    mutationFn: (body: {
      firstName: string
      lastName: string
      dateOfBirth?: string
    }) => apiClient.PATCH("/patients/me", { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["patient-profile"] })
      void queryClient.invalidateQueries({ queryKey: ["session"] })
      setProfileSuccess(true)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.DELETE("/patients/me"),
    onSuccess: () => {
      void authClient.signOut().then(() => {
        queryClient.removeQueries({ queryKey: ["session"] })
        void navigate({ to: "/" })
      })
    },
  })

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
    if (!dob) {
      setProfileError("Date of birth is required.")
      return
    }
    updateMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: dob.toISOString().split("T")[0],
    })
  }

  function handleDeleteConfirm() {
    if (deleteConfirm !== "DELETE") return
    deleteMutation.mutate()
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) {
      setDeleteConfirm("")
    }
    setDeleteOpen(open)
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-base text-muted-foreground">
          Manage your account details.
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

              <div className="flex flex-col gap-1.5">
                <Label className="text-base font-medium tracking-normal normal-case">
                  Date of birth
                </Label>
                <Popover open={dobOpen} onOpenChange={setDobOpen}>
                  <PopoverTrigger
                    type="button"
                    className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-base font-normal hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <RiCalendarLine className="size-4 shrink-0 text-muted-foreground" />
                    {dob ? (
                      dob.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    ) : (
                      <span className="text-muted-foreground">
                        Select date of birth
                      </span>
                    )}
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar
                      mode="single"
                      selected={dob}
                      onSelect={(d) => {
                        setDob(d)
                        setDobOpen(false)
                        setProfileSuccess(false)
                      }}
                      captionLayout="dropdown"
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                      defaultMonth={
                        dob ?? new Date(new Date().getFullYear() - 25, 0)
                      }
                      disabled={{ after: new Date() }}
                      classNames={{ caption_label: "hidden" }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {profileError && (
                <p className="text-sm text-destructive">{profileError}</p>
              )}
              {updateMutation.isError && !profileError && (
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
                className="w-full"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Access */}
      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-base text-muted-foreground">
            Control which doctors can view your health data.
          </p>
          <Link
            to="/patient/access"
            className="inline-flex items-center gap-2 text-base font-medium text-primary underline underline-offset-2 hover:text-primary/80"
          >
            <RiShieldLine className="size-4" />
            Manage access
          </Link>
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

      {/* Danger zone */}
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <p className="font-semibold text-destructive">Delete account</p>
        <p className="mt-1 text-base text-muted-foreground">
          This will permanently delete all your readings, notes, access grants,
          and access log entries. This cannot be undone.
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-3"
          onClick={() => setDeleteOpen(true)}
        >
          Delete my account
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={handleDeleteDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-base text-muted-foreground">
              Type{" "}
              <span className="font-mono font-bold tracking-widest text-foreground">
                DELETE
              </span>{" "}
              to confirm. This action cannot be reversed.
            </p>
            <Input
              className="text-base"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
            {deleteMutation.isError && (
              <p className="text-sm text-destructive">
                Failed to delete account. Please try again.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={
                  deleteConfirm !== "DELETE" || deleteMutation.isPending
                }
                onClick={handleDeleteConfirm}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete account"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDeleteDialogChange(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
