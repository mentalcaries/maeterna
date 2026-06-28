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
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import {
  RiHeartPulseLine,
  RiSearchLine,
  RiCloseLine,
  RiCheckLine,
} from "@remixicon/react"
import {
  institutions,
  verifyMBTT,
  setDoctorPending,
  completeDoctorOnboarding,
  doctors,
} from "@/mock/db"
import type { DoctorInstitution } from "@/mock/db"
import { getSession } from "@/mock/auth"

export const Route = createFileRoute("/doctor/onboarding")({
  component: DoctorOnboardingPage,
})

type Step = 1 | 2

type Affiliation = Pick<
  DoctorInstitution,
  "institutionId" | "institutionName" | "department"
>

function DoctorOnboardingPage() {
  const navigate = useNavigate()
  const session = getSession()

  const [step, setStep] = useState<Step>(1)
  const [mbttNumber, setMbttNumber] = useState("")
  const [mbttError, setMbttError] = useState("")
  const [verifying, setVerifying] = useState(false)

  const [instQuery, setInstQuery] = useState("")
  const [affiliations, setAffiliations] = useState<Affiliation[]>([])

  if (!session || session.role !== "doctor") return null

  const doctor = doctors.find((d) => d.id === session.userId)

  function handleVerifyMBTT(e: React.FormEvent) {
    e.preventDefault()
    setMbttError("")
    if (!mbttNumber.trim()) {
      setMbttError("Please enter your registration number.")
      return
    }
    setVerifying(true)
    const result = verifyMBTT(mbttNumber.trim().toUpperCase())
    setVerifying(false)

    if (result) {
      setStep(2)
    } else {
      setDoctorPending(session!.userId, mbttNumber.trim().toUpperCase())
      void navigate({ to: "/doctor/pending" })
    }
  }

  function handleAddAffiliation(
    institutionId: string,
    institutionName: string,
    department: string
  ) {
    const already = affiliations.some(
      (a) => a.institutionId === institutionId && a.department === department
    )
    if (already) return
    setAffiliations((prev) => [
      ...prev,
      { institutionId, institutionName, department },
    ])
  }

  function handleRemoveAffiliation(institutionId: string, department: string) {
    setAffiliations((prev) =>
      prev.filter(
        (a) =>
          !(a.institutionId === institutionId && a.department === department)
      )
    )
  }

  function handleCompleteOnboarding() {
    if (affiliations.length === 0) return
    completeDoctorOnboarding(session!.userId, affiliations)
    void navigate({ to: "/doctor/dashboard" })
  }

  const filteredInstitutions = instQuery.trim()
    ? institutions.filter((inst) =>
        inst.name.toLowerCase().includes(instQuery.toLowerCase())
      )
    : institutions

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <RiHeartPulseLine className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        <p className="text-sm text-muted-foreground">
          Welcome, {doctor?.name ?? session.name}. Let's get you set up.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        {([1, 2] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : step > s
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? <RiCheckLine className="size-3.5" /> : s}
            </div>
            <span
              className={`text-xs ${step === s ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {s === 1 ? "Registration" : "Institution"}
            </span>
            {s < 2 && <span className="text-muted-foreground/50">—</span>}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Registration number</CardTitle>
            <CardDescription>
              Enter your MBTT (Medical Board of Trinidad and Tobago)
              registration number for verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyMBTT} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mbtt">MBTT registration number</Label>
                <Input
                  id="mbtt"
                  placeholder="e.g. MBTT-2847"
                  value={mbttNumber}
                  onChange={(e) => setMbttNumber(e.target.value)}
                  autoComplete="off"
                />
              </div>
              {mbttError && (
                <p className="text-sm text-destructive">{mbttError}</p>
              )}
              <Button type="submit" className="w-full" disabled={verifying}>
                Verify registration
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Institution & department</CardTitle>
            <CardDescription>
              Add your hospital or practice affiliations. You can add multiple.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Selected affiliations */}
            {affiliations.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {affiliations.map((a) => (
                    <Badge
                      key={`${a.institutionId}-${a.department}`}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {a.department} · {a.institutionName}
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveAffiliation(a.institutionId, a.department)
                        }
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        aria-label="Remove"
                      >
                        <RiCloseLine className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Separator />
              </div>
            )}

            {/* Institution search */}
            <div className="relative">
              <RiSearchLine className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search institutions…"
                value={instQuery}
                onChange={(e) => setInstQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Institution list */}
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {filteredInstitutions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No institutions found.
                </p>
              ) : (
                filteredInstitutions.map((inst) => (
                  <div
                    key={inst.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <p className="text-sm font-medium">{inst.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {inst.departments.map((dept) => {
                        const isSelected = affiliations.some(
                          (a) =>
                            a.institutionId === inst.id && a.department === dept
                        )
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() =>
                              isSelected
                                ? handleRemoveAffiliation(inst.id, dept)
                                : handleAddAffiliation(inst.id, inst.name, dept)
                            }
                            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {isSelected && <RiCheckLine className="size-3" />}
                            {dept}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <Button
              className="w-full"
              disabled={affiliations.length === 0}
              onClick={handleCompleteOnboarding}
            >
              Complete setup
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
