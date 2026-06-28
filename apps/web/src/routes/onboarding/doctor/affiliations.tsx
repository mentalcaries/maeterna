import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card"
import {
  RiHeartPulseLine,
  RiSearchLine,
  RiCloseLine,
  RiCheckLine,
} from "@remixicon/react"
import { apiClient } from "@/lib/api-client"
import type { components } from "@/lib/api.types"

export const Route = createFileRoute("/onboarding/doctor/affiliations")({
  component: DoctorAffiliationsPage,
})

type Affiliation = {
  institutionId: string
  institutionName: string
  departmentId: string
  departmentName: string
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

  function handleAddAffiliation(
    inst: components["schemas"]["Institution"],
    dept: components["schemas"]["Department"]
  ) {
    const already = affiliations.some(
      (a) => a.institutionId === inst.id && a.departmentId === dept.id
    )
    if (already) return
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

  function handleRemoveAffiliation(
    institutionId: string,
    departmentId: string
  ) {
    setAffiliations((prev) =>
      prev.filter(
        (a) =>
          !(
            a.institutionId === institutionId && a.departmentId === departmentId
          )
      )
    )
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
        <p className="text-sm text-muted-foreground">Step 2 of 2</p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Institution &amp; department</CardTitle>
          <CardDescription>
            Add your hospital or practice affiliations. You can add multiple.
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
                    key={`${a.institutionId}-${a.departmentId}`}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {a.departmentName} · {a.institutionName}
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveAffiliation(a.institutionId, a.departmentId)
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
              placeholder="Search institutions…"
              value={instQuery}
              onChange={(e) => setInstQuery(e.target.value)}
              className="pl-9"
            />
          </div>

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
                          a.institutionId === inst.id &&
                          a.departmentId === dept.id
                      )
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() =>
                            isSelected
                              ? handleRemoveAffiliation(inst.id, dept.id)
                              : handleAddAffiliation(inst, dept)
                          }
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {isSelected && <RiCheckLine className="size-3" />}
                          {dept.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {affiliationsMutation.isError && (
            <p className="text-sm text-destructive">
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
        </CardContent>
      </Card>
    </div>
  )
}
