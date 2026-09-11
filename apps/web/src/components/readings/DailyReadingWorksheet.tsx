import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarLine,
  RiCheckLine,
  RiRefreshLine,
} from "@remixicon/react"
import { Button } from "@/components/button"
import { Calendar } from "@/components/calendar"
import { Input } from "@/components/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover"
import { apiClient } from "@/lib/api-client"
import { getAppUser } from "@/lib/auth-client"
import { isSuspiciousGlucoseValue, mgdlToMmol } from "@/lib/glucose"
import { glucoseSlotFor, localDateKey } from "@/lib/reading-history"
import { useSession } from "@/lib/session"
import { cn } from "@/lib/utils"
import type { components } from "@/lib/api.types"

type ApiReading = components["schemas"]["Reading"]
type GlucoseSlot = "fasted" | "post_breakfast" | "post_lunch" | "post_dinner"
type BpSlot = "morning" | "evening"
type SaveState = "idle" | "saving" | "saved" | "error"

const glucoseSlots: { key: GlucoseSlot; label: string; detail: string }[] = [
  { key: "fasted", label: "Fasting", detail: "Before breakfast" },
  { key: "post_breakfast", label: "After breakfast", detail: "1 hour after" },
  { key: "post_lunch", label: "After lunch", detail: "1 hour after" },
  { key: "post_dinner", label: "After dinner", detail: "1 hour after" },
]

const bpSlots: { key: BpSlot; label: string; detail: string }[] = [
  { key: "morning", label: "Morning", detail: "Morning reading" },
  { key: "evening", label: "Evening", detail: "Evening reading" },
]

const slotHours: Record<GlucoseSlot | BpSlot, number> = {
  fasted: 6,
  post_breakfast: 9,
  post_lunch: 13,
  post_dinner: 19,
  morning: 7,
  evening: 20,
}

function dateForSlot(date: Date, slot: GlucoseSlot | BpSlot) {
  const timestamp = new Date(date)
  timestamp.setHours(slotHours[slot], 0, 0, 0)
  return timestamp.toISOString()
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-TT", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function sameDate(left: Date, right: Date) {
  return localDateKey(left) === localDateKey(right)
}

function slotFor(reading: ApiReading): GlucoseSlot | BpSlot | null {
  if (reading.slot) return reading.slot as GlucoseSlot | BpSlot
  if (reading.type === "blood_pressure") {
    return reading.context === "evening" ? "evening" : "morning"
  }
  const legacy = glucoseSlotFor(reading)
  return legacy === "fasted" ? "fasted" : `post_${legacy}`
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state === "idle") return null
  if (state === "saving") {
    return <p className="text-xs text-muted-foreground">Saving...</p>
  }
  if (state === "error") {
    return (
      <p className="text-xs text-destructive">Could not save. Tap to retry.</p>
    )
  }
  return (
    <p className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
      <RiCheckLine className="size-3" /> Saved
    </p>
  )
}

export function DailyReadingWorksheet() {
  const queryClient = useQueryClient()
  const { data: sessionData } = useSession()
  const user = getAppUser(sessionData)
  const [date, setDate] = useState(() => new Date())
  const [dateOpen, setDateOpen] = useState(false)
  const [type, setType] = useState<"glucose" | "blood_pressure">("glucose")
  const [glucoseDrafts, setGlucoseDrafts] = useState<
    Record<GlucoseSlot, string>
  >(
    () =>
      Object.fromEntries(glucoseSlots.map(({ key }) => [key, ""])) as Record<
        GlucoseSlot,
        string
      >
  )
  const [bpDrafts, setBpDrafts] = useState<Record<BpSlot, [string, string]>>(
    () => ({ morning: ["", ""], evening: ["", ""] })
  )
  const [states, setStates] = useState<Record<string, SaveState>>({})
  const [pendingDelete, setPendingDelete] = useState<ApiReading | null>(null)

  const { data: readingsData } = useQuery({
    queryKey: ["readings", "daily", localDateKey(date)],
    queryFn: () =>
      apiClient.GET("/patients/me/readings", {
        params: { query: { limit: 200 } },
      }),
  })
  const { data: prefsData } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiClient.GET("/preferences"),
  })
  const glucoseUnit =
    (prefsData?.data?.glucoseUnit as "mg/dL" | "mmol/L" | undefined) ?? "mg/dL"
  const selectedDateKey = localDateKey(date)
  const readings = (readingsData?.data?.data ?? []).filter(
    (reading) =>
      reading.readingDate === selectedDateKey ||
      (!reading.readingDate && sameDate(new Date(reading.timestamp), date))
  )
  const ownReadings = readings.filter(
    (reading) => reading.loggedById === user?.id
  )
  const legacyPostMealReadings = ownReadings.filter(
    (reading) =>
      reading.type === "glucose" &&
      reading.context === "post_meal" &&
      !reading.slot
  )
  const legacyInferredSlots = new Set(
    legacyPostMealReadings.map((reading) => glucoseSlotFor(reading))
  )
  const legacyBatchSlots = new Map<string, GlucoseSlot>()
  if (legacyPostMealReadings.length === 3 && legacyInferredSlots.size === 1) {
    const batchOrder: GlucoseSlot[] = [
      "post_breakfast",
      "post_lunch",
      "post_dinner",
    ]
    const sortedLegacyPostMealReadings = [...legacyPostMealReadings].sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    )
    sortedLegacyPostMealReadings.forEach((reading, index) =>
      legacyBatchSlots.set(reading.id, batchOrder[index])
    )
  }
  const bySlot = new Map<string, ApiReading>()
  for (const reading of ownReadings) {
    const slot = legacyBatchSlots.get(reading.id) ?? slotFor(reading)
    if (!slot) continue
    const existing = bySlot.get(slot)
    if (
      !existing ||
      new Date(existing.createdAt) < new Date(reading.createdAt)
    ) {
      bySlot.set(slot, reading)
    }
  }

  useEffect(() => {
    setGlucoseDrafts(
      Object.fromEntries(
        glucoseSlots.map(({ key }) => {
          const reading = bySlot.get(key)
          const value = reading
            ? glucoseUnit === "mmol/L"
              ? mgdlToMmol(reading.value1)
              : reading.value1
            : ""
          return [key, String(value)]
        })
      ) as Record<GlucoseSlot, string>
    )
    setBpDrafts({
      morning: bpValue("morning"),
      evening: bpValue("evening"),
    })
  }, [readingsData?.data?.data, date, glucoseUnit])

  function bpValue(slot: BpSlot): [string, string] {
    const reading = bySlot.get(slot)
    return reading
      ? [String(reading.value1), String(reading.value2 ?? "")]
      : ["", ""]
  }

  const saveMutation = useMutation({
    mutationFn: async ({
      slot,
      value1,
      value2,
    }: {
      slot: GlucoseSlot | BpSlot
      value1: number
      value2?: number
    }) => {
      const existing = bySlot.get(slot)
      const isGlucose = slot === "fasted" || slot.startsWith("post_")
      const body = isGlucose
        ? {
            type: "glucose" as const,
            value1,
            unit: glucoseUnit,
            context:
              slot === "fasted" ? ("fasted" as const) : ("post_meal" as const),
            readingDate: selectedDateKey,
            slot: slot as GlucoseSlot,
            timestamp: dateForSlot(date, slot as GlucoseSlot),
          }
        : {
            type: "blood_pressure" as const,
            value1,
            value2: value2 ?? 0,
            unit: "mmHg" as const,
            context: slot as BpSlot,
            readingDate: selectedDateKey,
            slot: slot as BpSlot,
            timestamp: dateForSlot(date, slot as BpSlot),
          }
      const result = existing
        ? await apiClient.PATCH("/patients/me/readings/{readingId}", {
            params: { path: { readingId: existing.id } },
            body,
          })
        : await apiClient.POST("/patients/me/readings", { body })
      if (result.error) throw new Error("Unable to save reading")
    },
    onSuccess: async (_, variables) => {
      setStates((current) => ({ ...current, [variables.slot]: "saved" }))
      await queryClient.invalidateQueries({ queryKey: ["readings"] })
    },
    onError: (_, variables) => {
      setStates((current) => ({ ...current, [variables.slot]: "error" }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (reading: ApiReading) => {
      const result = await apiClient.DELETE(
        "/patients/me/readings/{readingId}",
        {
          params: { path: { readingId: reading.id } },
        }
      )
      if (result.error) throw new Error("Unable to delete reading")
    },
    onSuccess: async () => {
      setPendingDelete(null)
      await queryClient.invalidateQueries({ queryKey: ["readings"] })
    },
  })

  function saveGlucose(slot: GlucoseSlot) {
    const value = Number(glucoseDrafts[slot])
    if (!Number.isFinite(value) || value <= 0) return
    if (isSuspiciousGlucoseValue(value, glucoseUnit)) {
      setStates((current) => ({ ...current, [slot]: "error" }))
      return
    }
    setStates((current) => ({ ...current, [slot]: "saving" }))
    saveMutation.mutate({ slot, value1: value })
  }

  function saveBp(slot: BpSlot) {
    const [systolic, diastolic] = bpDrafts[slot]
    const value1 = Number(systolic)
    const value2 = Number(diastolic)
    if (
      !Number.isFinite(value1) ||
      !Number.isFinite(value2) ||
      value1 <= 0 ||
      value2 <= 0
    )
      return
    setStates((current) => ({ ...current, [slot]: "saving" }))
    saveMutation.mutate({ slot, value1, value2 })
  }

  function onGlucoseBlur(slot: GlucoseSlot) {
    if (!glucoseDrafts[slot]) {
      const reading = bySlot.get(slot)
      if (reading) setPendingDelete(reading)
      return
    }
    saveGlucose(slot)
  }

  const glucoseCount = glucoseSlots.filter(({ key }) => bySlot.has(key)).length
  const bpCount = bpSlots.filter(({ key }) => bySlot.has(key)).length
  const isToday = sameDate(date, new Date())

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-2xl font-semibold">Daily readings</h1>
        <p className="text-base text-muted-foreground">
          Add or adjust one day at a time.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous day"
          onClick={() =>
            setDate(
              (current) =>
                new Date(
                  current.getFullYear(),
                  current.getMonth(),
                  current.getDate() - 1
                )
            )
          }
        >
          <RiArrowLeftSLine className="size-5" />
        </Button>
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger className="flex min-h-11 flex-1 items-center justify-center gap-2 text-sm font-semibold hover:text-primary">
            <RiCalendarLine className="size-4" /> {isToday ? "Today, " : ""}
            {formatDate(date)}
          </PopoverTrigger>
          <PopoverContent>
            <Calendar
              mode="single"
              selected={date}
              defaultMonth={date}
              endMonth={new Date()}
              fixedWeeks
              disabled={{ after: new Date() }}
              onSelect={(nextDate) => {
                if (nextDate) setDate(nextDate)
                setDateOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next day"
          disabled={isToday}
          onClick={() =>
            setDate(
              (current) =>
                new Date(
                  current.getFullYear(),
                  current.getMonth(),
                  current.getDate() + 1
                )
            )
          }
        >
          <RiArrowRightSLine className="size-5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 rounded-lg border border-border p-1">
        {(["glucose", "blood_pressure"] as const).map((nextType) => (
          <button
            key={nextType}
            type="button"
            onClick={() => setType(nextType)}
            className={cn(
              "h-10 rounded-md text-sm font-medium transition-colors",
              type === nextType
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {nextType === "glucose" ? "Blood glucose" : "Blood pressure"}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {type === "glucose"
          ? `${glucoseCount} of 4 readings saved`
          : `${bpCount} of 2 readings saved`}
      </p>

      {type === "glucose" ? (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {glucoseSlots.map(({ key, label, detail }) => (
            <div key={key} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{detail}</p>
                <SaveStatus state={states[key] ?? "idle"} />
              </div>
              <Input
                aria-label={`${label} glucose reading`}
                className="h-11 w-28 text-right"
                type="number"
                min="0"
                step="0.1"
                placeholder={glucoseUnit === "mg/dL" ? "e.g. 120" : "e.g. 5.4"}
                value={glucoseDrafts[key]}
                onChange={(event) =>
                  setGlucoseDrafts((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                onBlur={() => onGlucoseBlur(key)}
              />
              <span className="w-12 text-xs text-muted-foreground">
                {glucoseUnit}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {bpSlots.map(({ key, label, detail }) => (
            <div key={key} className="flex flex-col gap-2 p-4">
              <div>
                <p className="text-base font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{detail}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  aria-label={`${label} systolic`}
                  type="number"
                  min="0"
                  placeholder="Systolic"
                  value={bpDrafts[key][0]}
                  onChange={(event) =>
                    setBpDrafts((current) => ({
                      ...current,
                      [key]: [event.target.value, current[key][1]],
                    }))
                  }
                  onBlur={() => saveBp(key)}
                />
                <Input
                  aria-label={`${label} diastolic`}
                  type="number"
                  min="0"
                  placeholder="Diastolic"
                  value={bpDrafts[key][1]}
                  onChange={(event) =>
                    setBpDrafts((current) => ({
                      ...current,
                      [key]: [current[key][0], event.target.value],
                    }))
                  }
                  onBlur={() => saveBp(key)}
                />
              </div>
              <SaveStatus state={states[key] ?? "idle"} />
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p>Delete this saved reading?</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteMutation.mutate(pendingDelete)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const slot = slotFor(pendingDelete)
                if (slot && (slot === "morning" || slot === "evening"))
                  setBpDrafts((current) => ({
                    ...current,
                    [slot]: bpValue(slot),
                  }))
                if (slot && slot !== "morning" && slot !== "evening")
                  setGlucoseDrafts((current) => ({
                    ...current,
                    [slot]: String(bySlot.get(slot)?.value1 ?? ""),
                  }))
                setPendingDelete(null)
              }}
            >
              Keep reading
            </Button>
          </div>
        </div>
      )}

      {Object.values(states).some((state) => state === "error") && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const retry = Object.entries(states).find(
              ([, state]) => state === "error"
            )?.[0]
            if (retry) {
              if (retry === "morning" || retry === "evening") saveBp(retry)
              else saveGlucose(retry as GlucoseSlot)
            }
          }}
        >
          <RiRefreshLine /> Retry failed save
        </Button>
      )}
    </div>
  )
}
