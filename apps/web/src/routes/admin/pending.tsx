import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/dialog"
import { apiClient } from "@/lib/api-client"
import type { components } from "@/lib/api.types"

export const Route = createFileRoute("/admin/pending")({
  component: AdminPendingPage,
})

type Doctor = components["schemas"]["Doctor"]

function AdminPendingPage() {
  const queryClient = useQueryClient()
  const [confirmDoctor, setConfirmDoctor] = useState<Doctor | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ["admin-users", undefined, "pending_verification", 0],
    queryFn: async () => {
      const res = await apiClient.GET("/admin/users", {
        params: {
          query: { status: "pending_verification", limit: 50 },
        },
      })
      return res.data ?? { data: [], total: 0 }
    },
  })

  const doctors = (data?.data ?? []).filter(
    (u): u is Doctor => u.role === "doctor"
  )

  const approveMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.POST("/admin/users/{userId}/approve", {
        params: { path: { userId } },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      setConfirmDoctor(null)
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Pending Approvals</h1>
        <p className="text-sm text-muted-foreground">
          {isPending
            ? "Loading…"
            : `${doctors.length} doctor${doctors.length !== 1 ? "s" : ""} awaiting verification`}
        </p>
      </div>

      {!isPending && doctors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No accounts pending approval.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>MBTT Member ID</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.map((doctor) => (
              <TableRow key={doctor.id}>
                <TableCell className="font-medium">
                  {doctor.firstName} {doctor.lastName}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {doctor.email}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {doctor.registrationNumber || "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(doctor.createdAt).toLocaleDateString("en-TT", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setConfirmDoctor(doctor)}
                  >
                    Approve
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={!!confirmDoctor}
        onOpenChange={(open) => !open && setConfirmDoctor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve doctor</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Approve{" "}
            <span className="font-medium text-foreground">
              {confirmDoctor?.firstName} {confirmDoctor?.lastName}
            </span>{" "}
            as a verified doctor? They will gain full access to the platform.
          </p>
          {approveMutation.isError && (
            <p className="text-sm text-destructive">
              Failed to approve. Please try again.
            </p>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDoctor(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={approveMutation.isPending}
              onClick={() =>
                confirmDoctor && approveMutation.mutate(confirmDoctor.id)
              }
            >
              {approveMutation.isPending ? "Approving…" : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
