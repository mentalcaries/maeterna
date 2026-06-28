import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import { RiSearchLine, RiUserLine, RiBuilding2Line } from "@remixicon/react"
import {
  doctors,
  doctorInstitutions,
  addAccessGrant,
  revokeAccessGrant,
  getPatientAccessGrants,
  getPatientAccessLogs,
} from "@/mock/db"
import type { Doctor, DoctorInstitution } from "@/mock/db"
import { getSession } from "@/mock/auth"

export const Route = createFileRoute("/patient/access")({
  component: PatientAccessPage,
})

function PatientAccessPage() {
  const session = getSession()
  const [query, setQuery] = useState("")
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedAffiliation, setSelectedAffiliation] =
    useState<DoctorInstitution | null>(null)
  const [grantType, setGrantType] = useState<"individual" | "department">(
    "individual"
  )
  const [grantDialogOpen, setGrantDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  if (!session) return null
  const patientId = session.userId

  const filteredDoctors =
    query.trim().length < 1
      ? []
      : doctors.filter((d) => {
          const q = query.toLowerCase()
          if (d.name.toLowerCase().includes(q)) return true
          return doctorInstitutions
            .filter((di) => di.doctorId === d.id)
            .some(
              (di) =>
                di.institutionName.toLowerCase().includes(q) ||
                di.department.toLowerCase().includes(q)
            )
        })

  const activeGrants = getPatientAccessGrants(patientId)
  const accessLog = getPatientAccessLogs(patientId)

  function openGrantDialog(doctor: Doctor) {
    const affiliations = doctorInstitutions.filter(
      (di) => di.doctorId === doctor.id
    )
    setSelectedDoctor(doctor)
    setSelectedAffiliation(affiliations[0] ?? null)
    setGrantType("individual")
    setGrantDialogOpen(true)
  }

  function handleGrant() {
    if (!selectedDoctor) return
    if (grantType === "individual") {
      addAccessGrant({
        patientId,
        grantType: "individual",
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        institutionId: selectedAffiliation?.institutionId,
        institutionName: selectedAffiliation?.institutionName,
        grantedAt: new Date().toISOString(),
        revokedAt: null,
      })
    } else {
      addAccessGrant({
        patientId,
        grantType: "department",
        department: selectedAffiliation?.department,
        institutionId: selectedAffiliation?.institutionId,
        institutionName: selectedAffiliation?.institutionName,
        grantedAt: new Date().toISOString(),
        revokedAt: null,
      })
    }
    setGrantDialogOpen(false)
    setSelectedDoctor(null)
    setQuery("")
    setRefreshKey((k) => k + 1)
  }

  function handleRevoke(grantId: string) {
    revokeAccessGrant(grantId)
    setRefreshKey((k) => k + 1)
  }

  const selectedAffiliations = selectedDoctor
    ? doctorInstitutions.filter((di) => di.doctorId === selectedDoctor.id)
    : []

  return (
    <div key={refreshKey} className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-xl font-semibold">Manage Access</h1>
        <p className="text-sm text-muted-foreground">
          Control which doctors can view your health data.
        </p>
      </div>

      {/* Search & Grant */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold">Grant access</p>
        <div className="relative">
          <RiSearchLine className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by doctor name or institution…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredDoctors.length > 0 && (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {filteredDoctors.map((doctor) => {
              const affiliations = doctorInstitutions.filter(
                (di) => di.doctorId === doctor.id
              )
              const primary = affiliations[0]
              return (
                <button
                  key={doctor.id}
                  type="button"
                  onClick={() => openGrantDialog(doctor)}
                  className="flex items-start justify-between gap-3 p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">{doctor.name}</p>
                    {primary ? (
                      <p className="text-xs text-muted-foreground">
                        {primary.department} · {primary.institutionName}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {doctor.specialty}
                      </p>
                    )}
                  </div>
                  <span className="mt-0.5 text-xs text-primary">Grant</span>
                </button>
              )
            })}
          </div>
        )}

        {query.trim().length >= 1 && filteredDoctors.length === 0 && (
          <p className="text-sm text-muted-foreground">No doctors found.</p>
        )}
      </div>

      <Separator />

      {/* Active grants + log */}
      <Tabs defaultValue="grants">
        <TabsList className="w-full">
          <TabsTrigger value="grants" className="flex-1">
            Active grants
            {activeGrants.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {activeGrants.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="log" className="flex-1">
            Access log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grants" className="mt-4">
          {activeGrants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No active grants. Use the search above to grant access to a
              doctor.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {activeGrants.map((grant) => (
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
                      <p className="text-sm font-medium">
                        {grant.grantType === "individual"
                          ? grant.doctorName
                          : `${grant.department ?? "Department"}`}
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
                    onClick={() => handleRevoke(grant.id)}
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
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No access log entries yet.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {accessLog.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-0.5 p-3">
                  <p className="text-sm font-medium">{entry.doctorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.institution}
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
              <p className="text-sm text-muted-foreground">
                Choose the scope of access for{" "}
                <span className="font-medium text-foreground">
                  {selectedDoctor.name}
                </span>
                .
              </p>

              <div className="flex flex-col gap-2">
                <GrantOption
                  selected={grantType === "individual"}
                  onSelect={() => setGrantType("individual")}
                  icon={RiUserLine}
                  label={selectedDoctor.name}
                  sub="This doctor only"
                />

                {selectedAffiliations.length > 0 && (
                  <>
                    {selectedAffiliations.map((aff) => (
                      <GrantOption
                        key={aff.id}
                        selected={
                          grantType === "department" &&
                          selectedAffiliation?.id === aff.id
                        }
                        onSelect={() => {
                          setGrantType("department")
                          setSelectedAffiliation(aff)
                        }}
                        icon={RiBuilding2Line}
                        label={`${aff.department} at ${aff.institutionName}`}
                        sub="All doctors in this department"
                      />
                    ))}
                  </>
                )}
              </div>
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
            <Button size="sm" onClick={handleGrant}>
              Grant access
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
