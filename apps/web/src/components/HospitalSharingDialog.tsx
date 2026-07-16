import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { RiBuilding2Line } from "@remixicon/react"
import { Button } from "@/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog"
import type { components } from "@/lib/api.types"
import { apiClient } from "@/lib/api-client"
import {
  formatGrantDate,
  initialHospitalSelection,
  type HospitalSharingOption,
} from "@/lib/hospital-sharing"
import { cn } from "@/lib/utils"

type AccessGrant = components["schemas"]["AccessGrant"]

export function HospitalSharingDialog({
  grant,
  open,
  onOpenChange,
}: {
  grant: AccessGrant | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const options = grant?.hospitalSharingOptions ?? []
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    string | null
  >(null)
  const [shareConfirmation, setShareConfirmation] =
    useState<HospitalSharingOption | null>(null)
  const [stopConfirmation, setStopConfirmation] =
    useState<HospitalSharingOption | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSelectedDepartmentId(initialHospitalSelection(options))
    setShareConfirmation(null)
    setStopConfirmation(null)
    setFeedback(null)
    setErrorMessage(null)
  }, [grant?.id, open])

  const shareMutation = useMutation({
    mutationFn: async (option: HospitalSharingOption) => {
      const result = await apiClient.POST("/patients/me/grants", {
        body: {
          grantType: "department",
          granteeId: option.departmentId,
        },
      })
      if (result.response.status === 409) return { alreadyShared: true }
      if (result.error) throw new Error("Unable to share with this hospital")
      return { alreadyShared: false }
    },
    onMutate: () => {
      setErrorMessage(null)
      setFeedback(null)
    },
    onSuccess: async ({ alreadyShared }, option) => {
      await queryClient.invalidateQueries({ queryKey: ["grants"] })
      setShareConfirmation(null)
      setSelectedDepartmentId(null)
      if (alreadyShared) {
        setFeedback(`Already shared with ${option.displayName}.`)
      } else {
        onOpenChange(false)
      }
    },
    onError: () => {
      setErrorMessage("Could not share your health data. Please try again.")
    },
  })

  const stopMutation = useMutation({
    mutationFn: async (option: HospitalSharingOption) => {
      if (!option.activeDepartmentGrantId) {
        throw new Error("No active access to stop")
      }
      const result = await apiClient.DELETE("/patients/me/grants/{grantId}", {
        params: {
          path: { grantId: option.activeDepartmentGrantId },
        },
      })
      if (result.error) throw new Error("Unable to stop sharing")
    },
    onMutate: () => {
      setErrorMessage(null)
      setFeedback(null)
    },
    onSuccess: async (_, option) => {
      await queryClient.invalidateQueries({ queryKey: ["grants"] })
      setStopConfirmation(null)
      setSelectedDepartmentId(options.length === 1 ? option.departmentId : null)
      setFeedback(`Stopped sharing with ${option.displayName}.`)
    },
    onError: () => {
      setErrorMessage("Could not stop sharing. Please try again.")
    },
  })

  const selectedOption = options.find(
    (option) =>
      option.departmentId === selectedDepartmentId &&
      option.activeDepartmentGrantId === null
  )
  const hasShareableOption = options.some(
    (option) => option.activeDepartmentGrantId === null
  )
  const isPending = shareMutation.isPending || stopMutation.isPending

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isPending) return
    onOpenChange(nextOpen)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Share with Department</DialogTitle>
            <DialogDescription>
              Let all doctors in {grant?.granteeName}'s department access your
              readings.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
            {options.map((option) =>
              option.activeDepartmentGrantId === null ? (
                <button
                  key={option.institutionId}
                  type="button"
                  aria-pressed={selectedDepartmentId === option.departmentId}
                  onClick={() => {
                    setSelectedDepartmentId(option.departmentId)
                    setFeedback(null)
                    setErrorMessage(null)
                  }}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-all",
                    selectedDepartmentId === option.departmentId
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/40"
                  )}
                >
                  <RiBuilding2Line
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      selectedDepartmentId === option.departmentId
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-sm font-medium break-words",
                        selectedDepartmentId === option.departmentId
                          ? "text-primary"
                          : "text-foreground"
                      )}
                    >
                      {option.displayName}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      All doctors at this hospital
                    </span>
                  </span>
                </button>
              ) : (
                <div
                  key={option.institutionId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <RiBuilding2Line className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words">
                        {option.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Shared since {formatGrantDate(option.grantedAt!)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="xs"
                    disabled={isPending}
                    onClick={() => setStopConfirmation(option)}
                  >
                    Stop sharing
                  </Button>
                </div>
              )
            )}
          </div>

          {feedback && (
            <p className="mt-3 text-sm text-emerald-700">{feedback}</p>
          )}
          {errorMessage && (
            <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
          )}

          <DialogFooter className="mt-4 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
            {hasShareableOption && (
              <Button
                size="sm"
                disabled={!selectedOption || isPending}
                onClick={() =>
                  selectedOption && setShareConfirmation(selectedOption)
                }
              >
                Share
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={shareConfirmation !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !shareMutation.isPending) setShareConfirmation(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share with this hospital?</DialogTitle>
            <DialogDescription>
              Share your health data with all doctors at{" "}
              {shareConfirmation?.displayName}?
            </DialogDescription>
          </DialogHeader>
          {errorMessage && (
            <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={shareMutation.isPending}
              onClick={() => setShareConfirmation(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={shareMutation.isPending}
              onClick={() =>
                shareConfirmation && shareMutation.mutate(shareConfirmation)
              }
            >
              {shareMutation.isPending ? "Sharing…" : "Share"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={stopConfirmation !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !stopMutation.isPending) setStopConfirmation(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop sharing?</DialogTitle>
            <DialogDescription>
              Stop sharing your health data with all doctors at{" "}
              {stopConfirmation?.displayName}?
            </DialogDescription>
          </DialogHeader>
          {errorMessage && (
            <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={stopMutation.isPending}
              onClick={() => setStopConfirmation(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={stopMutation.isPending}
              onClick={() =>
                stopConfirmation && stopMutation.mutate(stopConfirmation)
              }
            >
              {stopMutation.isPending ? "Stopping…" : "Stop sharing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
