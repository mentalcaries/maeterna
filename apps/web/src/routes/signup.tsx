import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
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
import { RiHeartPulseLine, RiUserLine, RiBuilding2Line } from "@remixicon/react"
import { cn } from "@workspace/ui/lib/utils"
import {
  doctors,
  doctorInstitutions,
  inviteUser,
  addAccessGrant,
} from "@/mock/db"
import type { Patient } from "@/mock/db"
import { setSession } from "@/mock/auth"

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>) => ({
    invitedBy:
      typeof search.invitedBy === "string" ? search.invitedBy : undefined,
  }),
  component: SignupPage,
})

type Step = "create" | "invite"

function SignupPage() {
  const navigate = useNavigate()
  const { invitedBy } = Route.useSearch()

  const [step, setStep] = useState<Step>("create")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [newPatient, setNewPatient] = useState<Patient | null>(null)
  const [grantChoice, setGrantChoice] = useState<
    "individual" | "department" | null
  >(null)

  const invitingDoctor = invitedBy
    ? doctors.find((d) => d.id === invitedBy)
    : null
  const invitingAffiliation = invitingDoctor
    ? (doctorInstitutions.find((di) => di.doctorId === invitingDoctor.id) ??
      null)
    : null

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name.trim()) {
      setError("Please enter your name.")
      return
    }
    if (!email.trim()) {
      setError("Please enter your email address.")
      return
    }

    const created = inviteUser("patient", name.trim(), email.trim()) as Patient
    setNewPatient(created)
    setSession({ userId: created.id, role: "patient", name: created.name })

    if (invitingDoctor) {
      setStep("invite")
    } else {
      void navigate({ to: "/patient/dashboard" })
    }
  }

  function handleInviteChoice(grant: boolean) {
    if (!newPatient || !invitingDoctor) return

    if (grant && grantChoice) {
      if (grantChoice === "individual") {
        addAccessGrant({
          patientId: newPatient.id,
          grantType: "individual",
          doctorId: invitingDoctor.id,
          doctorName: invitingDoctor.name,
          institutionId: invitingAffiliation?.institutionId,
          institutionName: invitingAffiliation?.institutionName,
          grantedAt: new Date().toISOString(),
          revokedAt: null,
        })
      } else {
        addAccessGrant({
          patientId: newPatient.id,
          grantType: "department",
          department: invitingAffiliation?.department,
          institutionId: invitingAffiliation?.institutionId,
          institutionName: invitingAffiliation?.institutionName,
          grantedAt: new Date().toISOString(),
          revokedAt: null,
        })
      }
    }

    void navigate({ to: "/patient/dashboard" })
  }

  if (step === "invite" && invitingDoctor) {
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
              {invitingDoctor.name} has invited you to share your health data
              with them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium">{invitingDoctor.name}</p>
              {invitingAffiliation && (
                <p className="text-xs text-muted-foreground">
                  {invitingAffiliation.department} ·{" "}
                  {invitingAffiliation.institutionName}
                </p>
              )}
            </div>

            <p className="mb-3 text-sm font-medium">
              Do you want to grant access?
            </p>

            <div className="mb-4 flex flex-col gap-2">
              <GrantOption
                selected={grantChoice === "individual"}
                onSelect={() => setGrantChoice("individual")}
                icon={RiUserLine}
                label={`${invitingDoctor.name} only`}
                sub="Individual access"
              />
              {invitingAffiliation && (
                <GrantOption
                  selected={grantChoice === "department"}
                  onSelect={() => setGrantChoice("department")}
                  icon={RiBuilding2Line}
                  label={`${invitingAffiliation.department} at ${invitingAffiliation.institutionName}`}
                  sub="All doctors in this department"
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                disabled={grantChoice === null}
                onClick={() => handleInviteChoice(true)}
              >
                Yes, grant access
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => handleInviteChoice(false)}
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
        <p className="text-sm text-muted-foreground">
          Maternal Health Monitoring
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            {invitingDoctor
              ? `You've been invited by ${invitingDoctor.name}.`
              : "Join Maeterna to track your health."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" size="lg">
              {invitingDoctor ? "Continue" : "Create account"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <a
              href="/patient/login"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Already have an account? Sign in
            </a>
          </div>
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
