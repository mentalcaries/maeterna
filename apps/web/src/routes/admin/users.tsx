import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import { Label } from "@workspace/ui/components/label"
import {
  patients,
  doctors,
  setAccountStatus,
  reassignPatient,
  addAuditEntry,
} from "@/mock/db"
import { getSession } from "@/mock/auth"

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
})

function AdminUsersPage() {
  const session = getSession()
  const [refreshKey, setRefreshKey] = useState(0)
  const [reassignPatientId, setReassignPatientId] = useState<string | null>(
    null
  )
  const [newDoctorId, setNewDoctorId] = useState(doctors[0]?.id ?? "")
  const [reassignOpen, setReassignOpen] = useState(false)

  const allUsers = [
    ...patients.map((p) => ({ ...p, type: "patient" as const })),
    ...doctors.map((d) => ({ ...d, type: "doctor" as const })),
  ]

  function handleToggleStatus(userId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "suspended" : "active"
    setAccountStatus(userId, newStatus as "active" | "suspended")
    const user = allUsers.find((u) => u.id === userId)
    if (user && session) {
      addAuditEntry({
        actorId: session.userId,
        actorName: session.name,
        action:
          newStatus === "suspended"
            ? "Suspended account"
            : "Reactivated account",
        targetId: userId,
        targetName: user.name,
        timestamp: new Date().toISOString(),
      })
    }
    setRefreshKey((k) => k + 1)
  }

  function handleReassign() {
    if (!reassignPatientId || !newDoctorId) return
    const patient = patients.find((p) => p.id === reassignPatientId)
    const doctor = doctors.find((d) => d.id === newDoctorId)
    reassignPatient(reassignPatientId, newDoctorId)
    if (patient && doctor && session) {
      addAuditEntry({
        actorId: session.userId,
        actorName: session.name,
        action: "Reassigned patient",
        targetId: reassignPatientId,
        targetName: `${patient.name} → ${doctor.name}`,
        timestamp: new Date().toISOString(),
      })
    }
    setReassignOpen(false)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          {allUsers.length} total users
        </p>
      </div>

      <Table key={refreshKey}>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Assigned to</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allUsers.map((user) => {
            const assignedDoctor =
              user.type === "patient"
                ? doctors.find(
                    (d) => d.id === (user as (typeof patients)[0]).doctorId
                  )
                : null

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {assignedDoctor?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      user.status === "active" ? "success" : "destructive"
                    }
                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={
                        user.status === "active" ? "destructive" : "outline"
                      }
                      size="xs"
                      onClick={() => handleToggleStatus(user.id, user.status)}
                    >
                      {user.status === "active" ? "Suspend" : "Reactivate"}
                    </Button>
                    {user.type === "patient" && (
                      <>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setReassignPatientId(user.id)
                            setNewDoctorId(
                              (user as (typeof patients)[0]).doctorId ??
                                doctors[0]?.id ??
                                ""
                            )
                            setReassignOpen(true)
                          }}
                        >
                          Reassign
                        </Button>
                        <Dialog
                          open={reassignOpen && reassignPatientId === user.id}
                          onOpenChange={setReassignOpen}
                        >
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reassign {user.name}</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-2">
                              <Label htmlFor="new-doctor">
                                Assign to doctor
                              </Label>
                              <Select
                                value={newDoctorId}
                                onValueChange={setNewDoctorId}
                              >
                                <SelectTrigger id="new-doctor">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {doctors.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>
                                      {d.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <DialogFooter className="mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setReassignOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button size="sm" onClick={handleReassign}>
                                Confirm
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
