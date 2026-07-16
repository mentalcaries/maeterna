import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/button"
import { Badge } from "@/components/badge"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/select"
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

type UserRow =
  | components["schemas"]["Patient"]
  | components["schemas"]["Doctor"]
type RoleFilter = "all" | "patient" | "doctor"
type StatusFilter = "all" | "active" | "suspended"

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
  validateSearch: (s: Record<string, unknown>) => ({
    role: (s.role as RoleFilter | undefined) ?? "all",
    status: (s.status as StatusFilter | undefined) ?? "all",
  }),
})

const PAGE_SIZE = 50

function statusBadge(status: string) {
  if (status === "active") return <Badge variant="success">Active</Badge>
  return <Badge variant="destructive">Suspended</Badge>
}

function roleBadge(role: string) {
  if (role === "patient")
    return (
      <Badge
        variant="outline"
        className="border-blue-400 text-blue-600 dark:text-blue-400"
      >
        Patient
      </Badge>
    )
  return (
    <Badge
      variant="outline"
      className="border-purple-400 text-purple-600 dark:text-purple-400"
    >
      Doctor
    </Badge>
  )
}

type ConfirmAction =
  | { type: "suspend"; user: UserRow }
  | { type: "reactivate"; user: UserRow }

function AdminUsersPage() {
  const search = Route.useSearch()
  const queryClient = useQueryClient()

  const [roleFilter, setRoleFilter] = useState<RoleFilter>(search.role)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(search.status)
  const [offset, setOffset] = useState(0)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const apiRole =
    roleFilter === "all" ? undefined : (roleFilter as "patient" | "doctor")
  const apiStatus =
    statusFilter === "all"
      ? undefined
      : (statusFilter as "active" | "suspended")

  const { data, isPending } = useQuery({
    queryKey: ["admin-users", roleFilter, statusFilter, offset],
    queryFn: async () => {
      const res = await apiClient.GET("/admin/users", {
        params: {
          query: {
            role: apiRole,
            status: apiStatus,
            limit: PAGE_SIZE,
            offset: offset || null,
          },
        },
      })
      return res.data ?? { data: [], total: 0 }
    },
  })

  const users = data?.data ?? []
  const total = data?.total ?? 0
  const pageCount = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE)

  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      status,
    }: {
      userId: string
      status: "active" | "suspended"
    }) =>
      apiClient.PATCH("/admin/users/{userId}/status", {
        params: { path: { userId } },
        body: { status },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      setConfirmAction(null)
    },
  })

  function handleConfirm() {
    if (!confirmAction) return
    if (confirmAction.type === "suspend") {
      statusMutation.mutate({
        userId: confirmAction.user.id,
        status: "suspended",
      })
    } else if (confirmAction.type === "reactivate") {
      statusMutation.mutate({
        userId: confirmAction.user.id,
        status: "active",
      })
    }
  }

  const isMutating = statusMutation.isPending

  function resetFilters(role: RoleFilter, status: StatusFilter) {
    setRoleFilter(role)
    setStatusFilter(status)
    setOffset(0)
  }

  function userName(u: UserRow) {
    return `${u.firstName} ${u.lastName}`
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            {isPending ? "Loading…" : `${total} users`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Role</span>
          <Select
            value={roleFilter}
            onValueChange={(v) => resetFilters(v as RoleFilter, statusFilter)}
            items={{
              all: "All roles",
              patient: "Patient",
              doctor: "Doctor",
            }}
          >
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="patient">Patient</SelectItem>
              <SelectItem value="doctor">Doctor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status</span>
          <Select
            value={statusFilter}
            onValueChange={(v) => resetFilters(roleFilter, v as StatusFilter)}
            items={{
              all: "All statuses",
              active: "Active",
              suspended: "Suspended",
            }}
          >
            <SelectTrigger className="h-8 w-48 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {users.length === 0 && !isPending ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No users match these filters.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{userName(user)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>{roleBadge(user.role)}</TableCell>
                <TableCell>{statusBadge(user.status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString("en-TT", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.status === "active" && (
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() =>
                          setConfirmAction({ type: "suspend", user })
                        }
                      >
                        Suspend
                      </Button>
                    )}
                    {user.status === "suspended" && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() =>
                          setConfirmAction({ type: "reactivate", user })
                        }
                      >
                        Reactivate
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Page {currentPage + 1} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "suspend"
                ? "Suspend account"
                : "Reactivate account"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmAction?.type === "suspend" ? (
              <>
                Suspend{" "}
                <span className="font-medium text-foreground">
                  {confirmAction.user ? userName(confirmAction.user) : ""}
                </span>
                ? They will lose access to the platform immediately.
              </>
            ) : (
              <>
                Reactivate{" "}
                <span className="font-medium text-foreground">
                  {confirmAction?.user ? userName(confirmAction.user) : ""}
                </span>
                ? They will regain access to the platform.
              </>
            )}
          </p>
          {statusMutation.isError && (
            <p className="text-sm text-destructive">
              Action failed. Please try again.
            </p>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={
                confirmAction?.type === "suspend" ? "destructive" : "default"
              }
              disabled={isMutating}
              onClick={handleConfirm}
            >
              {isMutating ? "Working…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
