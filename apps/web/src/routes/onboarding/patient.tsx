import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@workspace/ui/components/popover"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  RiHeartPulseLine,
  RiCalendarLine,
  RiUserLine,
  RiBuilding2Line,
} from "@remixicon/react"
import { cn } from "@workspace/ui/lib/utils"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/onboarding/patient")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: PatientOnboardingPage,
})

type Step = "profile" | "invite-confirm"

function PatientOnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { token } = useSearch({ from: "/onboarding/patient" })

  const [step, setStep] = useState<Step>("profile")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dob, setDob] = useState<Date | undefined>(undefined)
  const [error, setError] = useState("")
  const [grantType, setGrantType] = useState<"individual" | "department">(
    "individual"
  )

  const { data: inviteData } = useQuery({
    queryKey: ["invite", token],
    queryFn: async () => {
      if (!token) return null
      const res = await apiClient.GET("/invites/{token}", {
        params: { path: { token } },
      })
      return res.data ?? null
    },
    enabled: !!token,
  })

  const profileMutation = useMutation({
    mutationFn: (body: {
      firstName: string
      lastName: string
      dateOfBirth?: string
    }) => apiClient.PATCH("/patients/me", { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["session"] })
      if (token && inviteData) {
        setStep("invite-confirm")
      } else {
        void navigate({ to: "/patient/dashboard" })
      }
    },
  })

  const grantMutation = useMutation({
    mutationFn: (body: {
      grantType: "individual" | "department"
      granteeId: string
    }) => apiClient.POST("/patients/me/grants", { body }),
    onSuccess: () => void navigate({ to: "/patient/dashboard" }),
    onError: () => void navigate({ to: "/patient/dashboard" }),
  })

  function handleProfile(e: React.FormEvent) {
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
    profileMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: dob ? dob.toISOString().split("T")[0] : undefined,
    })
  }

  function handleGrantChoice(grant: boolean) {
    if (grant && inviteData) {
      grantMutation.mutate({
        grantType,
        granteeId: inviteData.doctorId,
      })
    } else {
      void navigate({ to: "/patient/dashboard" })
    }
  }

  if (step === "invite-confirm" && inviteData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <RiHeartPulseLine className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        </div>

        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Doctor invite</CardTitle>
            <CardDescription>
              {inviteData.doctorName} has invited you to share your health data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium">{inviteData.doctorName}</p>
              <p className="text-xs text-muted-foreground">
                {inviteData.departmentName} · {inviteData.institutionName}
              </p>
            </div>

            <p className="text-sm font-medium">Do you want to grant access?</p>

            <div className="flex flex-col gap-2">
              <GrantOption
                selected={grantType === "individual"}
                onSelect={() => setGrantType("individual")}
                icon={RiUserLine}
                label={`${inviteData.doctorName} only`}
                sub="Individual access"
              />
              <GrantOption
                selected={grantType === "department"}
                onSelect={() => setGrantType("department")}
                icon={RiBuilding2Line}
                label={`${inviteData.departmentName} at ${inviteData.institutionName}`}
                sub="All doctors in this department"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => handleGrantChoice(true)}
                disabled={grantMutation.isPending}
              >
                Yes, grant access
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => handleGrantChoice(false)}
                disabled={grantMutation.isPending}
              >
                Skip for now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <RiHeartPulseLine className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        <p className="text-sm text-muted-foreground">Complete your profile</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>
            We need a few details to set up your health record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfile} className="flex flex-col gap-4">
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
              <Label>Date of birth</Label>
              <Popover>
                <PopoverTrigger
                  type="button"
                  className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-normal hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
                    onSelect={setDob}
                    disabled={{ after: new Date() }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {profileMutation.isError && (
              <p className="text-sm text-destructive">
                Failed to save profile. Please try again.
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

function GrantOption({
  selected,
  onSelect,
  icon: Icon,
  label,
  sub,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  sub: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/30 hover:bg-muted/40"
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          selected ? "text-primary" : "text-muted-foreground"
        )}
      />
      <div>
        <p
          className={cn(
            "text-sm font-medium",
            selected ? "text-primary" : "text-foreground"
          )}
        >
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </button>
  )
}
