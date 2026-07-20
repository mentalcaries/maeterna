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
import { type GlucoseUnit } from "@/lib/glucose"
import { formatReadingValue } from "@/lib/readings"
import type { Reading } from "@/mock/db"

function readingDescription(
  reading: Reading | null,
  glucoseUnit: GlucoseUnit
): string {
  if (!reading) return "This reading will be permanently deleted."

  const value = formatReadingValue(reading, glucoseUnit)
  const timestamp = new Date(reading.timestamp).toLocaleString("en-TT", {
    dateStyle: "medium",
    timeStyle: "short",
  })
  return `${value} from ${timestamp} will be permanently deleted.`
}

export function DeleteReadingDialog({
  reading,
  glucoseUnit,
  open,
  onOpenChange,
}: {
  reading: Reading | null
  glucoseUnit: GlucoseUnit
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!reading) throw new Error("No reading selected")
      const result = await apiClient.DELETE(
        "/patients/me/readings/{readingId}",
        {
          params: { path: { readingId: reading.id } },
        }
      )
      if (result.error) throw new Error("Unable to delete reading.")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["readings"] })
      onOpenChange(false)
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (deleteMutation.isPending) return
    if (!nextOpen) deleteMutation.reset()
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete reading?</DialogTitle>
          <DialogDescription>
            {readingDescription(reading, glucoseUnit)}
          </DialogDescription>
        </DialogHeader>

        {deleteMutation.isError && (
          <p className="mt-3 text-sm text-destructive">
            Could not delete reading. Please try again.
          </p>
        )}

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={deleteMutation.isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
