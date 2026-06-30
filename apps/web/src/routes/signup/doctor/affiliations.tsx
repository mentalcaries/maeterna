import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Button } from "@/components/button"
import { Input } from "@/components/input"
import { Badge } from "@/components/badge"
import { Separator } from "@/components/separator"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/card"
import { RiSearchLine, RiCloseLine, RiCheckLine } from "@remixicon/react"
import { apiClient } from "@/lib/api-client"
import type { components } from "@/lib/api.types"

export const Route = createFileRoute("/signup/doctor/affiliations")({
  component: DoctorAffiliationsPage,
})

type Affiliation = {
  institutionId: string
  institutionName: string
  departmentId: string
  departmentName: string
}

function findOGDepartment(inst: components["schemas"]["Institution"]) {
  return (
    inst.departments.find((d) => d.name.includes("Obstetrics")) ??
    inst.departments[0]
  )
}

function DoctorAffiliationsPage() {
  const navigate = useNavigate()
  const [instQuery, setInstQuery] = useState("")
  const [affiliations, setAffiliations] = useState<Affiliation[]>([])

  const { data: institutions = [] } = useQuery({
    queryKey: ["institutions"],
    queryFn: async () => {
      const res = await apiClient.GET("/institutions")
      return res.data ?? []
    },
  })

  const affiliationsMutation = useMutation({
    mutationFn: (body: {
      affiliations: { institutionId: string; departmentId: string }[]
    }) => apiClient.PUT("/profile/doctor/affiliations", { body }),
    onSuccess: () => void navigate({ to: "/doctor/dashboard" }),
  })

  function handleToggleInstitution(inst: components["schemas"]["Institution"]) {
    const dept = findOGDepartment(inst)
    if (!dept) return
    const isSelected = affiliations.some((a) => a.institutionId === inst.id)
    if (isSelected) {
      setAffiliations((prev) => prev.filter((a) => a.institutionId !== inst.id))
    } else {
      setAffiliations((prev) => [
        ...prev,
        {
          institutionId: inst.id,
          institutionName: inst.name,
          departmentId: dept.id,
          departmentName: dept.name,
        },
      ])
    }
  }

  function handleComplete() {
    if (affiliations.length === 0) return
    affiliationsMutation.mutate({
      affiliations: affiliations.map((a) => ({
        institutionId: a.institutionId,
        departmentId: a.departmentId,
      })),
    })
  }

  const hospitals = institutions.filter((i) => i.type === "hospital")
  const filteredInstitutions = instQuery.trim()
    ? hospitals.filter((inst) =>
        inst.name.toLowerCase().includes(instQuery.toLowerCase())
      )
    : hospitals

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-28 items-center justify-center rounded-full">
          <img src="/logo.png" alt="Maeterna" className="rounded-full" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        <p className="text-base text-muted-foreground">
          Step 2 of 2 — Hospital affiliations (optional)
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Add hospital affiliations (optional)</CardTitle>
          <CardDescription className="text-base">
            Add your hospital affiliations. You can update these later in
            Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {affiliations.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Selected
              </p>
              <div className="flex flex-wrap gap-2">
                {affiliations.map((a) => (
                  <Badge
                    key={a.institutionId}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {a.institutionName}
                    <button
                      type="button"
                      onClick={() =>
                        setAffiliations((prev) =>
                          prev.filter(
                            (x) => x.institutionId !== a.institutionId
                          )
                        )
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

          <div className="relative">
            <RiSearchLine className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search hospitals…"
              value={instQuery}
              onChange={(e) => setInstQuery(e.target.value)}
              className="pl-9 text-base"
            />
          </div>

          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {filteredInstitutions.length === 0 ? (
              <p className="text-base text-muted-foreground">
                No hospitals found.
              </p>
            ) : (
              filteredInstitutions.map((inst) => {
                const isSelected = affiliations.some(
                  (a) => a.institutionId === inst.id
                )
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => handleToggleInstitution(inst)}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="text-sm font-medium">{inst.name}</p>
                    {isSelected && (
                      <RiCheckLine className="size-4 shrink-0 text-primary" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {affiliationsMutation.isError && (
            <p className="text-base text-destructive">
              Failed to save affiliations. Please try again.
            </p>
          )}

          <Button
            className="w-full"
            disabled={
              affiliations.length === 0 || affiliationsMutation.isPending
            }
            onClick={handleComplete}
          >
            {affiliationsMutation.isPending ? "Saving…" : "Complete setup"}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => void navigate({ to: "/doctor/dashboard" })}
          >
            Skip for now
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
