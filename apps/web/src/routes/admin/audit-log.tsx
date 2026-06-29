import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/admin/audit-log")({
  component: AdminAuditLogPage,
})

const PAGE_SIZE = 50

function AdminAuditLogPage() {
  const [offset, setOffset] = useState(0)

  const { data, isPending } = useQuery({
    queryKey: ["audit-log", offset],
    queryFn: async () => {
      const res = await apiClient.GET("/admin/audit-log", {
        params: { query: { limit: PAGE_SIZE, offset: offset || null } },
      })
      return res.data ?? { data: [], total: 0 }
    },
  })

  const entries = data?.data ?? []
  const total = data?.total ?? 0
  const pageCount = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          {isPending ? "Loading…" : `${total} entries`}
        </p>
      </div>

      {!isPending && entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No audit entries yet.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const d = new Date(entry.timestamp)
              return (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs">
                    {d.toLocaleDateString("en-TT", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    <br />
                    <span className="text-muted-foreground">
                      {d.toLocaleTimeString("en-TT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{entry.actorName}</TableCell>
                  <TableCell className="text-sm">{entry.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.targetName ?? "—"}
                  </TableCell>
                </TableRow>
              )
            })}
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
    </div>
  )
}
