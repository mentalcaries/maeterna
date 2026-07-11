import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/button"
import { Input } from "@/components/input"
import { Badge } from "@/components/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs"
import { Separator } from "@/components/separator"
import { cn } from "@/lib/utils"
import { RiSearchLine, RiUserLine, RiBuilding2Line } from "@remixicon/react"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/patient/access")({
  component: PatientAccessPage,
})

type SearchDoctorAffiliation = {
  type: "institution" | "practice"
  institutionId: string | null
  departmentId: string | null
  displayName: string
}

type SearchDoctor = {
  id: string
  name: string
  registrationNumber: string
  affiliations: SearchDoctorAffiliation[]
}

function PatientAccessPage() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [selectedDoctor, setSelectedDoctor] = useState<SearchDoctor | null>(
    null
  )
  const [selectedInstitutionAffiliation, setSelectedInstitutionAffiliation] =
    useState<SearchDoctorAffiliation | null>(null)
  const [grantType, setGrantType] = useState<"individual" | "department">(
    "individual"
  )
  const [grantDialogOpen, setGrantDialogOpen] = useState(false)

  const { data: grantsData = [] } = useQuery({
    queryKey: ["grants"],
    queryFn: async () => {
      const res = await apiClient.GET("/patients/me/grants")
      return res.data ?? []
    },
  })

  const { data: accessLog = [] } = useQuery({
    queryKey: ["access-log"],
    queryFn: async () => {
      const res = await apiClient.GET("/patients/me/access-log")
      return res.data ?? []
    },
  })

  const { data: searchResults = [] } = useQuery({
    queryKey: ["doctor-search", query],
    queryFn: async () => {
      const res = await apiClient.GET("/search/doctors", {
        params: { query: { q: query } },
      })
      return res.data ?? []
    },
    enabled: query.trim().length >= 2,
  })

  const grantMutation = useMutation({
    mutationFn: (body: {
      grantType: "individual" | "department"
      granteeId: string
    }) => apiClient.POST("/patients/me/grants", { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["grants"] })
      setGrantDialogOpen(false)
      setSelectedDoctor(null)
      setQuery("")
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (grantId: string) =>
      apiClient.DELETE("/patients/me/grants/{grantId}", {
        params: { path: { grantId } },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["grants"] })
    },
  })

  function openGrantDialog(doctor: SearchDoctor) {
    setSelectedDoctor(doctor)
    setSelectedInstitutionAffiliation(
      doctor.affiliations.find(
        (a) => a.type === "institution" && a.departmentId !== null
      ) ?? null
    )
    setGrantType("individual")
    setGrantDialogOpen(true)
  }

  function handleGrant() {
    if (!selectedDoctor) return
    const granteeId =
      grantType === "individual"
        ? selectedDoctor.id
        : (selectedInstitutionAffiliation?.departmentId ?? selectedDoctor.id)

    grantMutation.mutate({ grantType, granteeId })
  }

  const filteredResults = query.trim().length >= 2 ? searchResults : []

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-2xl font-semibold">Manage Access</h1>
        <p className="text-base text-muted-foreground">
          Control which doctors can view your health data.
        </p>
      </div>

      {/* Search & Grant */}
      <div className="flex flex-col gap-3">
        <p className="text-base font-semibold">Grant access</p>
        <div className="relative">
          <RiSearchLine className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by doctor name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredResults.length > 0 && (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {filteredResults.map((doctor) => (
              <button
                key={doctor.id}
                type="button"
                onClick={() => openGrantDialog(doctor)}
                className="flex items-start justify-between gap-3 p-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-base font-medium">{doctor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Reg. {doctor.registrationNumber}
                  </p>
                  {doctor.affiliations.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {doctor.affiliations
                        .map((a) => a.displayName)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
                <span className="mt-0.5 shrink-0 text-xs text-primary">
                  Grant
                </span>
              </button>
            ))}
          </div>
        )}

        {query.trim().length >= 2 && filteredResults.length === 0 && (
          <p className="text-base text-muted-foreground">No doctors found.</p>
        )}
      </div>

      <Separator />

      {/* Active grants + log */}
      <Tabs defaultValue="grants">
        <TabsList className="w-full">
          <TabsTrigger value="grants" className="flex-1">
            Active grants
            {grantsData.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {grantsData.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="log" className="flex-1">
            Access log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grants" className="mt-4">
          {grantsData.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-base text-muted-foreground">
              No active grants. Use the search above to grant access to a
              doctor.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {grantsData.map((grant) => (
                <div
                  key={grant.id}
                  className="flex items-start justify-between gap-3 p-3"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {grant.grantType === "individual" ? (
                        <RiUserLine className="size-3.5 text-muted-foreground" />
                      ) : (
                        <RiBuilding2Line className="size-3.5 text-muted-foreground" />
                      )}
                      <p className="text-base font-medium">
                        {grant.granteeName}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {grant.grantType === "individual"
                          ? "Individual"
                          : "Department"}
                      </Badge>
                    </div>
                    {grant.institutionName && (
                      <p className="text-xs text-muted-foreground">
                        {grant.institutionName}
                      </p>
                    )}
                    {grant.grantType === "individual" &&
                      grant.registrationNumber && (
                        <p className="text-xs text-muted-foreground">
                          Reg. {grant.registrationNumber}
                        </p>
                      )}
                    <p className="text-xs text-muted-foreground">
                      Granted{" "}
                      {new Date(grant.grantedAt).toLocaleDateString("en-TT", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={revokeMutation.isPending}
                    onClick={() => revokeMutation.mutate(grant.id)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          {accessLog.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-base text-muted-foreground">
              No access log entries yet.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {accessLog.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-0.5 p-3">
                  <p className="text-base font-medium">{entry.doctorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.institutionName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.accessedAt).toLocaleDateString("en-TT", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    at{" "}
                    {new Date(entry.accessedAt).toLocaleTimeString("en-TT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Grant dialog */}
      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant access</DialogTitle>
          </DialogHeader>

          {selectedDoctor && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <p className="text-base font-medium">{selectedDoctor.name}</p>
                <p className="text-xs text-muted-foreground">
                  Reg. {selectedDoctor.registrationNumber}
                </p>
                {selectedDoctor.affiliations.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedDoctor.affiliations
                      .map((a) => a.displayName)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>

              <Separator />

              <p className="text-sm text-muted-foreground">
                Choose the scope of access.
              </p>

              <div className="flex flex-col gap-2">
                <GrantOption
                  selected={grantType === "individual"}
                  onSelect={() => setGrantType("individual")}
                  icon={RiUserLine}
                  label={selectedDoctor.name}
                  sub="This doctor only"
                />

                {selectedInstitutionAffiliation && (
                  <GrantOption
                    selected={grantType === "department"}
                    onSelect={() => setGrantType("department")}
                    icon={RiBuilding2Line}
                    label={`All doctors at ${selectedInstitutionAffiliation.displayName}`}
                    sub="Department-wide access"
                  />
                )}
              </div>

              {grantMutation.isError && (
                <p className="text-sm text-destructive">
                  Failed to grant access. Please try again.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGrantDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleGrant}
              disabled={grantMutation.isPending}
            >
              {grantMutation.isPending ? "Granting…" : "Grant access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
