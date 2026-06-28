import { createFileRoute } from "@tanstack/react-router"
import { auditLog } from "@/mock/db"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

export const Route = createFileRoute("/admin/audit")({
  component: AdminAuditPage,
})

function AdminAuditPage() {
  const sorted = [...auditLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">{sorted.length} entries</p>
      </div>

      {sorted.length === 0 ? (
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
            {sorted.map((entry) => {
              const d = new Date(entry.timestamp)
              const dateStr = d.toLocaleDateString("en-TT", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
              const timeStr = d.toLocaleTimeString("en-TT", {
                hour: "2-digit",
                minute: "2-digit",
              })
              return (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs">
                    {dateStr}
                    <br />
                    <span className="text-muted-foreground">{timeStr}</span>
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
    </div>
  )
}
