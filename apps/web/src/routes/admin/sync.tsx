import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { RiRefreshLine } from "@remixicon/react"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/admin/sync")({
  component: AdminSyncPage,
})

function AdminSyncPage() {
  const queryClient = useQueryClient()

  const { data: status } = useQuery({
    queryKey: ["mbtt-sync-status"],
    queryFn: async () => {
      const res = await apiClient.GET("/admin/sync-mbtt/status")
      return res.data ?? null
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => apiClient.POST("/admin/sync-mbtt"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mbtt-sync-status"] })
    },
  })

  const lastSynced = status?.lastSyncedAt
    ? new Date(status.lastSyncedAt).toLocaleString("en-TT", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "Never"

  const syncResult = syncMutation.data?.data

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">MBTT Sync</h1>
        <p className="text-sm text-muted-foreground">
          Synchronise the MBTT national physician registry.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-sm">Registry sync</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            Manually trigger a sync of the MBTT national registry into the
            database. This runs automatically on the 1st of every month at 2:00
            AM AST.
          </p>

          <div className="rounded-md bg-muted/50 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Last synced</span>
              <span className="font-medium">{lastSynced}</span>
            </div>
            {status?.count != null && (
              <div className="mt-1 flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Registry entries</span>
                <span className="font-medium">
                  {status.count.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {syncMutation.isSuccess && syncResult && (
            <p className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
              Sync completed successfully — {syncResult.count.toLocaleString()}{" "}
              entries imported.
            </p>
          )}

          {syncMutation.isError && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Sync failed. Please try again.
            </p>
          )}

          <Button
            className="w-full sm:w-auto"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            <RiRefreshLine
              className={`mr-2 size-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
            />
            {syncMutation.isPending ? "Syncing…" : "Sync Now"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
