import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/button"
import { Input } from "@/components/input"
import { Badge } from "@/components/badge"
import { Separator } from "@/components/separator"
import { RiSearchLine, RiCloseLine, RiCheckLine } from "@remixicon/react"
import { apiClient } from "@/lib/api-client"

type AddMode = "institution" | "practice" | null

export function AffiliationManager() {
  const queryClient = useQueryClient()

  const [addMode, setAddMode] = useState<AddMode>(null)
  const [instQuery, setInstQuery] = useState("")
  const [pendingInstitution, setPendingInstitution] = useState<{
    id: string
    name: string
  } | null>(null)
  const [practiceName, setPracticeName] = useState("")
  const [addError, setAddError] = useState("")
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const { data: affiliations = [], isLoading } = useQuery({
    queryKey: ["doctor-affiliations"],
    queryFn: async () => {
      const res = await apiClient.GET("/profile/doctor/affiliations")
      return res.data ?? []
    },
  })

  const { data: institutions = [] } = useQuery({
    queryKey: ["institutions"],
    queryFn: async () => {
      const res = await apiClient.GET("/institutions")
      return res.data ?? []
    },
    enabled: addMode === "institution",
  })

  function invalidateAffiliations() {
    void queryClient.invalidateQueries({ queryKey: ["doctor-affiliations"] })
    void queryClient.invalidateQueries({ queryKey: ["doctor-me"] })
  }

  function resetAddState() {
    setAddMode(null)
    setInstQuery("")
    setPendingInstitution(null)
    setPracticeName("")
    setAddError("")
  }

  const addMutation = useMutation({
    mutationFn: async (
      body: { institutionId: string } | { practiceName: string }
    ) => {
      const res = await apiClient.POST("/profile/doctor/affiliations", {
        body,
      })
      if (res.error) {
        throw new Error(res.response.status === 409 ? "duplicate" : "failed")
      }
      return res.data
    },
    onSuccess: () => {
      invalidateAffiliations()
      resetAddState()
    },
    onError: (err) => {
      setAddError(
        err instanceof Error && err.message === "duplicate"
          ? "Already added"
          : "Failed to add affiliation. Please try again."
      )
    },
  })

  const removeMutation = useMutation({
    mutationFn: (affiliationId: string) =>
      apiClient.DELETE("/profile/doctor/affiliations/{affiliationId}", {
        params: { path: { affiliationId } },
      }),
    onSuccess: () => {
      invalidateAffiliations()
      setConfirmingId(null)
    },
  })

  const alreadyAffiliatedIds = new Set(
    affiliations
      .filter((a) => a.type === "institution" && a.institution)
      .map((a) => a.institution!.id)
  )
  const publicInstitutions = institutions.filter(
    (i) => i.type === "hospital" || i.type === "health_centre"
  )
  const filteredInstitutions = instQuery.trim()
    ? publicInstitutions.filter((inst) =>
        inst.name.toLowerCase().includes(instQuery.toLowerCase())
      )
    : publicInstitutions

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <p className="text-base text-muted-foreground">Loading…</p>
      ) : affiliations.length === 0 && !addMode ? (
        <p className="text-base text-muted-foreground">
          No affiliations added yet.
        </p>
      ) : affiliations.length > 0 ? (
        <div className="flex flex-col gap-2">
          {affiliations.map((aff) => (
            <div
              key={aff.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {aff.type === "institution"
                    ? aff.institution?.name
                    : aff.practiceName}
                </p>
                <Badge variant="outline" className="text-[10px]">
                  {aff.type === "institution" ? "Public" : "Private practice"}
                </Badge>
              </div>
              {confirmingId === aff.id ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="xs"
                    variant="destructive"
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate(aff.id)}
                  >
                    {removeMutation.isPending ? "Removing…" : "Confirm"}
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setConfirmingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingId(aff.id)}
                  className="ml-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Remove affiliation"
                >
                  <RiCloseLine className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {removeMutation.isError && (
        <p className="text-sm text-destructive">
          Failed to remove affiliation. Please try again.
        </p>
      )}

      {addMode && affiliations.length > 0 && <Separator />}

      {addMode === "institution" && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <RiSearchLine className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search institutions…"
              value={instQuery}
              onChange={(e) => setInstQuery(e.target.value)}
              className="pl-9 text-base"
              autoFocus
            />
          </div>

          <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
            {filteredInstitutions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No institutions found.
              </p>
            ) : (
              filteredInstitutions.map((inst) => {
                const alreadyAdded = alreadyAffiliatedIds.has(inst.id)
                const isPending = pendingInstitution?.id === inst.id
                return (
                  <button
                    key={inst.id}
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() =>
                      setPendingInstitution(
                        isPending ? null : { id: inst.id, name: inst.name }
                      )
                    }
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

          {addError && <p className="text-sm text-destructive">{addError}</p>}

          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!pendingInstitution || addMutation.isPending}
              onClick={() =>
                pendingInstitution &&
                addMutation.mutate({ institutionId: pendingInstitution.id })
              }
            >
              {addMutation.isPending ? "Adding…" : "Confirm"}
            </Button>
            <Button variant="outline" size="sm" onClick={resetAddState}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {addMode === "practice" && (
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Practice name"
            value={practiceName}
            onChange={(e) => setPracticeName(e.target.value.slice(0, 120))}
            className="text-base"
            autoFocus
          />

          {addError && <p className="text-sm text-destructive">{addError}</p>}

          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!practiceName.trim() || addMutation.isPending}
              onClick={() =>
                addMutation.mutate({ practiceName: practiceName.trim() })
              }
            >
              {addMutation.isPending ? "Adding…" : "Confirm"}
            </Button>
            <Button variant="outline" size="sm" onClick={resetAddState}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!addMode && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setAddMode("institution")}
          >
            Add public institution
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setAddMode("practice")}
          >
            Add private practice
          </Button>
        </div>
      )}
    </div>
  )
}
