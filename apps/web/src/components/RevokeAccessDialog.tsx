import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog"
import { apiClient } from "@/lib/api-client"
import type { components } from "@/lib/api.types"

type AccessGrant = components["schemas"]["AccessGrant"]

export function RevokeAccessDialog({
  grant,
  open,
  onOpenChange,
}: {
  grant: AccessGrant | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (!grant) throw new Error("No access selected")

      const result = await apiClient.DELETE("/patients/me/grants/{grantId}", {
        params: { path: { grantId: grant.id } },
      })
      if (result.error) throw new Error("Unable to revoke access")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["grants"] })
      onOpenChange(false)
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (revokeMutation.isPending) return
    if (!nextOpen) revokeMutation.reset()
    onOpenChange(nextOpen)
  }

  const description =
    grant?.grantType === "department"
      ? `Revoke access for all doctors at ${grant.institutionName || grant.granteeName}?`
      : `Revoke ${grant?.granteeName ?? "this doctor"}'s access to your health data?`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke access?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {revokeMutation.isError && (
          <p className="mt-3 text-sm text-destructive">
            Could not revoke access. Please try again.
          </p>
        )}

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={revokeMutation.isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={revokeMutation.isPending}
            onClick={() => revokeMutation.mutate()}
          >
            {revokeMutation.isPending ? "Revoking…" : "Revoke"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
