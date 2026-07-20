import { useEffect, useState } from "react"
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
import { Input } from "@/components/input"
import { Label } from "@/components/label"
import { apiClient } from "@/lib/api-client"
import {
  isSuspiciousGlucoseValue,
  mgdlToMmol,
  oppositeGlucoseUnit,
  type GlucoseUnit,
} from "@/lib/glucose"
import {
  combineLocalDateAndHour,
  hourOptionValue,
  roundToNearestAvailableHour,
} from "@/lib/reading-date-time"
import { cn } from "@/lib/utils"
import type { paths } from "@/lib/api.types"
import type { Reading } from "@/mock/db"
import { ReadingDateTimePicker } from "./ReadingDateTimePicker"

type MealContext = "fasted" | "post_meal"
type UpdateReadingBody =
  paths["/patients/me/readings/{readingId}"]["patch"]["requestBody"]["content"]["application/json"]

function displayValue(reading: Reading, glucoseUnit: GlucoseUnit): string {
  if (reading.type === "blood_pressure") return String(reading.value1)
  return String(
    glucoseUnit === "mmol/L" ? mgdlToMmol(reading.value1) : reading.value1
  )
}

export function EditReadingDialog({
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
  const [value1, setValue1] = useState("")
  const [value2, setValue2] = useState("")
  const [mealContext, setMealContext] = useState<MealContext>("fasted")
  const [activeGlucoseUnit, setActiveGlucoseUnit] =
    useState<GlucoseUnit>(glucoseUnit)
  const [unitPrompt, setUnitPrompt] = useState(false)
  const [unitDismissed, setUnitDismissed] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState("00:00")
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!reading || !open) return
    setValue1(displayValue(reading, glucoseUnit))
    setValue2(reading.value2 === undefined ? "" : String(reading.value2))
    setMealContext(reading.context === "post_meal" ? "post_meal" : "fasted")
    setActiveGlucoseUnit(glucoseUnit)
    setUnitPrompt(false)
    setUnitDismissed(false)
    setPendingSubmit(false)
    const roundedTimestamp = roundToNearestAvailableHour(
      new Date(reading.timestamp)
    )
    setDate(roundedTimestamp)
    setTime(hourOptionValue(roundedTimestamp))
    setValidationError(null)
  }, [reading, glucoseUnit, open])

  const updateMutation = useMutation({
    mutationFn: async (submissionUnit: GlucoseUnit) => {
      if (!reading) throw new Error("No reading selected")

      const firstValue = Number(value1)
      if (!Number.isFinite(firstValue) || firstValue <= 0) {
        throw new Error("Enter a valid reading value.")
      }
      const timestamp = combineLocalDateAndHour(date, time)
      if (!timestamp) {
        throw new Error("Select a valid date and time.")
      }

      let body: UpdateReadingBody
      if (reading.type === "glucose") {
        const valueUnchanged =
          submissionUnit === glucoseUnit &&
          firstValue === Number(displayValue(reading, glucoseUnit))
        body = {
          type: "glucose",
          value1: valueUnchanged ? reading.value1 : firstValue,
          unit: valueUnchanged ? "mg/dL" : submissionUnit,
          context: mealContext,
          timestamp: timestamp.toISOString(),
        }
      } else {
        const secondValue = Number(value2)
        if (!Number.isFinite(secondValue) || secondValue <= 0) {
          throw new Error("Enter a valid diastolic value.")
        }
        body = {
          type: "blood_pressure",
          value1: firstValue,
          value2: secondValue,
          unit: "mmHg",
          context: reading.context === "evening" ? "evening" : "morning",
          timestamp: timestamp.toISOString(),
        }
      }

      const result = await apiClient.PATCH(
        "/patients/me/readings/{readingId}",
        {
          params: { path: { readingId: reading.id } },
          body,
        }
      )
      if (result.error) throw new Error("Unable to update reading.")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["readings"] })
      onOpenChange(false)
    },
  })

  function saveReading(submissionUnit: GlucoseUnit) {
    setUnitPrompt(false)
    setPendingSubmit(false)
    updateMutation.mutate(submissionUnit, {
      onError: (error) => {
        setValidationError(
          error instanceof Error
            ? error.message
            : "Could not update reading. Please try again."
        )
      },
    })
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setValidationError(null)
    const firstValue = Number(value1)
    if (
      reading?.type === "glucose" &&
      !unitDismissed &&
      Number.isFinite(firstValue) &&
      isSuspiciousGlucoseValue(firstValue, activeGlucoseUnit)
    ) {
      setUnitPrompt(true)
      setPendingSubmit(true)
      return
    }
    saveReading(activeGlucoseUnit)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (updateMutation.isPending) return
    if (!nextOpen) {
      updateMutation.reset()
      setValidationError(null)
    }
    onOpenChange(nextOpen)
  }

  const title =
    reading?.type === "blood_pressure"
      ? "Edit blood pressure"
      : "Edit blood glucose"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Correct the reading value and when it was taken.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-reading-form"
          onSubmit={handleSubmit}
          className="mt-4 flex min-h-0 flex-col gap-5 overflow-y-auto p-1"
        >
          {reading?.type === "blood_pressure" ? (
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="edit-reading-value1">Systolic (mmHg)</Label>
                <Input
                  id="edit-reading-value1"
                  type="number"
                  min="0"
                  step="1"
                  value={value1}
                  onChange={(event) => setValue1(event.target.value)}
                  required
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="edit-reading-value2">Diastolic (mmHg)</Label>
                <Input
                  id="edit-reading-value2"
                  type="number"
                  min="0"
                  step="1"
                  value={value2}
                  onChange={(event) => setValue2(event.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-reading-value1">
                Reading ({activeGlucoseUnit})
              </Label>
              <Input
                id="edit-reading-value1"
                type="number"
                min="0"
                step="0.1"
                value={value1}
                onChange={(event) => {
                  setValue1(event.target.value)
                  setUnitPrompt(false)
                  setUnitDismissed(false)
                  setPendingSubmit(false)
                }}
                onBlur={() => {
                  const nextValue = Number(value1)
                  setUnitPrompt(
                    !unitDismissed &&
                      Number.isFinite(nextValue) &&
                      isSuspiciousGlucoseValue(nextValue, activeGlucoseUnit)
                  )
                }}
                required
              />
              {unitPrompt && (
                <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    This value looks like it may be in{" "}
                    {oppositeGlucoseUnit(activeGlucoseUnit)}. Switch units?
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="text-sm font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300"
                      onClick={() => {
                        const nextUnit = oppositeGlucoseUnit(activeGlucoseUnit)
                        setActiveGlucoseUnit(nextUnit)
                        setUnitDismissed(true)
                        if (pendingSubmit) saveReading(nextUnit)
                        else setUnitPrompt(false)
                      }}
                    >
                      Switch units
                    </button>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setUnitDismissed(true)
                        if (pendingSubmit) saveReading(activeGlucoseUnit)
                        else setUnitPrompt(false)
                      }}
                    >
                      Keep {activeGlucoseUnit}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {reading?.type === "glucose" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">
                Did you eat recently?
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "fasted" as const, label: "Fasted" },
                  { value: "post_meal" as const, label: "After eating" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={mealContext === option.value}
                    onClick={() => setMealContext(option.value)}
                    className={cn(
                      "rounded-lg border-2 p-3 text-left text-sm font-semibold transition-colors",
                      mealContext === option.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold tracking-wider uppercase">
              When?
            </Label>
            <ReadingDateTimePicker
              date={date}
              time={time}
              onDateChange={setDate}
              onTimeChange={setTime}
            />
          </div>

          {(validationError || updateMutation.isError) && (
            <p className="text-sm text-destructive">
              {validationError ?? "Could not update reading. Please try again."}
            </p>
          )}
        </form>

        <DialogFooter className="mt-4 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={updateMutation.isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-reading-form"
            size="sm"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
