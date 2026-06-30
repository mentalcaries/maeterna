import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/button"
import { Input } from "@/components/input"
import { Label } from "@/components/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card"
import { Separator } from "@/components/separator"
import { RiSearchLine, RiCloseLine, RiCheckLine } from "@remixicon/react"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { components } from "@/lib/api.types"

export const Route = createFileRoute("/doctor/settings")({
  component: DoctorSettingsPage,
})

function findOGDepartment(inst: components["schemas"]["Institution"]) {
  return (
    inst.departments.find((d) => d.name.includes("Obstetrics")) ??
    inst.departments[0]
  )
}

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

  const [showAddAffiliation, setShowAddAffiliation] = useState(false)
  const [instQuery, setInstQuery] = useState("")
  const [pendingInstitution, setPendingInstitution] = useState<{
    institutionId: string
    institutionName: string
    departmentId: string
    departmentName: string
  } | null>(null)

  useEffect(() => {
    if (doctor && !initialized) {
      setFirstName(doctor.firstName ?? "")
      setLastName(doctor.lastName ?? "")
      setInitialized(true)
    }
  }, [doctor, initialized])

  const { data: institutions = [] } = useQuery({
    queryKey: ["institutions"],
    queryFn: async () => {
      const res = await apiClient.GET("/institutions")
      return res.data ?? []
    },
    enabled: showAddAffiliation,
  })

  const patchProfile = useMutation({
    mutationFn: (body: { firstName: string; lastName: string }) =>
      apiClient.PATCH("/doctors/me", { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["doctor-me"] })
      void queryClient.invalidateQueries({ queryKey: ["session"] })
      setProfileSuccess(true)
    },
  })

  const deleteAffiliation = useMutation({
    mutationFn: (affiliationId: string) =>
      apiClient.DELETE("/profile/doctor/affiliations/{affiliationId}", {
        params: { path: { affiliationId } },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["doctor-me"] })
    },
  })

  const addAffiliation = useMutation({
    mutationFn: (newAff: { institutionId: string; departmentId: string }) => {
      const existing = (doctor?.affiliations ?? []).map((a) => ({
        institutionId: a.institutionId,
        departmentId: a.departmentId,
      }))
      return apiClient.PUT("/profile/doctor/affiliations", {
        body: { affiliations: [...existing, newAff] },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["doctor-me"] })
      setShowAddAffiliation(false)
      setInstQuery("")
      setPendingInstitution(null)
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
    patchProfile.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    })
  }

  function handleToggleInstitution(inst: components["schemas"]["Institution"]) {
    const dept = findOGDepartment(inst)
    if (!dept) return
    if (pendingInstitution?.institutionId === inst.id) {
      setPendingInstitution(null)
    } else {
      setPendingInstitution({
        institutionId: inst.id,
        institutionName: inst.name,
        departmentId: dept.id,
        departmentName: dept.name,
      })
    }
  }

  function handleConfirmAdd() {
    if (!pendingInstitution) return
    addAffiliation.mutate({
      institutionId: pendingInstitution.institutionId,
      departmentId: pendingInstitution.departmentId,
    })
  }

  function handleCancelAdd() {
    setShowAddAffiliation(false)
    setInstQuery("")
    setPendingInstitution(null)
  }

  const affiliations = doctor?.affiliations ?? []
  const hospitals = institutions.filter((i) => i.type === "hospital")
  const alreadyAffiliatedIds = new Set(affiliations.map((a) => a.institutionId))
  const filteredHospitals = instQuery.trim()
    ? hospitals.filter((h) =>
        h.name.toLowerCase().includes(instQuery.toLowerCase())
      )
    : hospitals

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-base text-muted-foreground">
          Manage your profile and hospital affiliations.
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

      {/* Hospital affiliations */}
      <Card>
        <CardHeader>
          <CardTitle>Hospital affiliations</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <p className="text-base text-muted-foreground">Loading…</p>
          ) : affiliations.length === 0 && !showAddAffiliation ? (
            <p className="text-base text-muted-foreground">
              No hospital affiliations added yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {affiliations.map((aff) => (
                <div
                  key={aff.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{aff.institutionName}</p>
                    <p className="text-xs text-muted-foreground">
                      {aff.departmentName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteAffiliation.mutate(aff.id)}
                    disabled={deleteAffiliation.isPending}
                    className="ml-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                    aria-label="Remove affiliation"
                  >
                    <RiCloseLine className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {deleteAffiliation.isError && (
            <p className="text-sm text-destructive">
              Failed to remove affiliation. Please try again.
            </p>
          )}

          {showAddAffiliation && (
            <>
              {affiliations.length > 0 && <Separator />}
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <RiSearchLine className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search hospitals…"
                    value={instQuery}
                    onChange={(e) => setInstQuery(e.target.value)}
                    className="pl-9 text-base"
                    autoFocus
                  />
                </div>

                <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                  {filteredHospitals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hospitals found.
                    </p>
                  ) : (
                    filteredHospitals.map((inst) => {
                      const alreadyAdded = alreadyAffiliatedIds.has(inst.id)
                      const isPending =
                        pendingInstitution?.institutionId === inst.id
                      return (
                        <button
                          key={inst.id}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => handleToggleInstitution(inst)}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            isPending
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <p className="text-sm font-medium">{inst.name}</p>
                          {alreadyAdded ? (
                            <span className="text-xs text-muted-foreground">
                              Added
                            </span>
                          ) : isPending ? (
                            <RiCheckLine className="size-4 shrink-0 text-primary" />
                          ) : null}
                        </button>
                      )
                    })
                  )}
                </div>

                {addAffiliation.isError && (
                  <p className="text-sm text-destructive">
                    Failed to add affiliation. Please try again.
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!pendingInstitution || addAffiliation.isPending}
                    onClick={handleConfirmAdd}
                  >
                    {addAffiliation.isPending ? "Adding…" : "Confirm"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancelAdd}>
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}

          {!showAddAffiliation && (
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setShowAddAffiliation(true)}
            >
              Add affiliation
            </Button>
          )}
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
