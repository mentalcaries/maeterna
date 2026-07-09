import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/button"
import { Input } from "@/components/input"
import { Label } from "@/components/label"
import { Textarea } from "@/components/textarea"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import {
  RiDropLine,
  RiHeartPulseLine,
  RiLeafLine,
  RiRestaurantLine,
  RiTimeLine,
  RiCalendarLine,
} from "@remixicon/react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/popover"
import { Calendar } from "@/components/calendar"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/select"
import type { ReadingType } from "@/mock/db"

type MealContext = "fasted" | "post_meal"
type WhenOption = "now" | "custom"
type GlucoseUnit = "mg/dL" | "mmol/L"

export type ReadingBody =
  | {
      type: "glucose"
      value1: number
      unit: "mg/dL" | "mmol/L"
      context: "fasted" | "post_meal"
      notes?: string | null
      timestamp: string
    }
  | {
      type: "blood_pressure"
      value1: number
      value2: number
      unit: "mmHg"
      context: "morning" | "evening"
      notes?: string | null
      timestamp: string
    }

interface ReadingFormProps {
  onSubmit: (body: ReadingBody) => Promise<void> | void
  isPending?: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

function ChoiceCard<T extends string>({
  value,
  selected,
  icon: Icon,
  label,
  sub,
  onSelect,
}: {
  value: T
  selected: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  sub?: string
  onSelect: (v: T) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border-2 p-3 text-left transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
      )}
    >
      <Icon
        className={cn(
          "size-4 transition-colors",
          selected ? "text-primary" : "text-muted-foreground"
        )}
      />
      <div>
        <p
          className={cn(
            "text-sm leading-none font-semibold",
            selected ? "text-primary" : "text-foreground"
          )}
        >
          {label}
        </p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
    </button>
  )
}

const MEAL_OPTIONS: {
  value: MealContext
  label: string
  sub: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    value: "fasted",
    label: "Fasted",
    sub: "No food in 2+ hrs",
    icon: RiLeafLine,
  },
  {
    value: "post_meal",
    label: "After eating",
    sub: "Within 2 hrs of a meal",
    icon: RiRestaurantLine,
  },
]

const WHEN_OPTIONS: {
  value: WhenOption
  label: string
  sub: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: "now", label: "Now", sub: "Current time", icon: RiTimeLine },
  {
    value: "custom",
    label: "Custom",
    sub: "Pick date & time",
    icon: RiCalendarLine,
  },
]

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h24 = String(i).padStart(2, "0")
  const period = i < 12 ? "AM" : "PM"
  const h12 = i === 0 ? 12 : i > 12 ? i - 12 : i
  return { value: `${h24}:00`, label: `${h12}:00 ${period}` }
})

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function valueSuspicious(v: number, unit: GlucoseUnit): boolean {
  if (unit === "mmol/L" && v > 35) return true
  if (unit === "mg/dL" && v < 20 && v > 0) return true
  return false
}

export function ReadingForm({
  onSubmit,
  isPending = false,
  onSuccess,
  onCancel,
}: ReadingFormProps) {
  const [type, setType] = useState<ReadingType>("glucose")
  const [value1, setValue1] = useState("")
  const [value2, setValue2] = useState("")
  const [mealContext, setMealContext] = useState<MealContext>("fasted")
  const [when, setWhen] = useState<WhenOption>("now")
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
  const [customDateOpen, setCustomDateOpen] = useState(false)
  const [customTime, setCustomTime] = useState<string>("06:00")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit>("mg/dL")
  const [unitPrompt, setUnitPrompt] = useState<
    "switch-to-mgdl" | "switch-to-mmol" | null
  >(null)
  // Tracks that user explicitly said "keep" for the current value
  const [unitDismissed, setUnitDismissed] = useState(false)
  // Tracks that submit was blocked pending unit prompt resolution
  const [pendingSubmit, setPendingSubmit] = useState(false)

  const { data: prefsData } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiClient.GET("/preferences"),
  })

  useEffect(() => {
    if (prefsData?.data?.glucoseUnit) {
      setGlucoseUnit(prefsData.data.glucoseUnit as GlucoseUnit)
    }
  }, [prefsData])

  function showPromptFor(unit: GlucoseUnit) {
    setUnitPrompt(unit === "mmol/L" ? "switch-to-mgdl" : "switch-to-mmol")
  }

  function handleValue1Blur() {
    if (type !== "glucose" || unitDismissed) return
    const v = parseFloat(value1)
    if (isNaN(v) || v <= 0) {
      setUnitPrompt(null)
      return
    }
    if (valueSuspicious(v, glucoseUnit)) {
      showPromptFor(glucoseUnit)
    } else {
      setUnitPrompt(null)
    }
  }

  function buildTimestamp(): string | null {
    if (when === "now") return new Date().toISOString()
    if (!customDate) return null
    const [h] = customTime.split(":").map(Number)
    const dt = new Date(customDate)
    dt.setHours(h, 0, 0, 0)
    return dt.toISOString()
  }

  async function doSubmit(activeUnit: GlucoseUnit) {
    const v1 = parseFloat(value1)
    const timestamp = buildTimestamp()
    if (!timestamp) {
      setError("Please select a date.")
      return
    }

    let body: ReadingBody
    if (type === "blood_pressure") {
      const v2 = parseFloat(value2)
      body = {
        type: "blood_pressure",
        value1: v1,
        value2: v2,
        unit: "mmHg",
        context: "morning",
        notes: notes.trim() || null,
        timestamp,
      }
    } else {
      body = {
        type: "glucose",
        value1: v1,
        unit: activeUnit,
        context: mealContext,
        notes: notes.trim() || null,
        timestamp,
      }
    }

    try {
      await onSubmit(body)
      setValue1("")
      setValue2("")
      setNotes("")
      setWhen("now")
      setCustomDate(undefined)
      setCustomTime("06:00")
      setUnitPrompt(null)
      setUnitDismissed(false)
      setPendingSubmit(false)
      onSuccess?.()
    } catch {
      setError("Failed to save reading. Please try again.")
    }
  }

  function handleSwitchUnit(newUnit: GlucoseUnit) {
    setGlucoseUnit(newUnit)
    setUnitPrompt(null)
    setUnitDismissed(false)
    if (pendingSubmit) {
      setPendingSubmit(false)
      void doSubmit(newUnit)
    }
  }

  function handleKeepUnit() {
    setUnitDismissed(true)
    setUnitPrompt(null)
    if (pendingSubmit) {
      setPendingSubmit(false)
      void doSubmit(glucoseUnit)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const v1 = parseFloat(value1)
    if (isNaN(v1) || v1 <= 0) {
      setError("Please enter a valid reading value.")
      return
    }

    if (type === "blood_pressure") {
      const v2 = parseFloat(value2)
      if (isNaN(v2) || v2 <= 0) {
        setError("Please enter a valid diastolic value.")
        return
      }
    }

    if (when !== "now" && !customDate) {
      setError("Please select a date.")
      return
    }

    // Blocking unit detection check — catches cases where blur never fired (mobile)
    if (
      type === "glucose" &&
      !unitDismissed &&
      valueSuspicious(v1, glucoseUnit)
    ) {
      showPromptFor(glucoseUnit)
      setPendingSubmit(true)
      return
    }

    await doSubmit(glucoseUnit)
  }

  const glucoseLabel =
    glucoseUnit === "mg/dL" ? "Reading (mg/dL)" : "Reading (mmol/L)"
  const glucosePlaceholder = glucoseUnit === "mg/dL" ? "e.g. 120" : "e.g. 5.4"

  const readingTypes: {
    value: ReadingType
    label: string
    unit: string
    icon: React.ComponentType<{ className?: string }>
  }[] = [
    {
      value: "glucose",
      label: "Blood Glucose",
      unit: glucoseUnit,
      icon: RiDropLine,
    },
    {
      value: "blood_pressure",
      label: "Blood Pressure",
      unit: "mmHg",
      icon: RiHeartPulseLine,
    },
  ]

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-6"
    >
      {/* Reading type */}
      <div className="flex flex-col gap-2">
        <Label>What are you measuring?</Label>
        <div className="grid grid-cols-2 gap-3">
          {readingTypes.map((t) => (
            <ChoiceCard
              key={t.value}
              value={t.value}
              selected={type === t.value}
              icon={t.icon}
              label={t.label}
              sub={t.unit}
              onSelect={(v) => {
                setType(v)
                setValue1("")
                setValue2("")
                setUnitPrompt(null)
                setUnitDismissed(false)
                setPendingSubmit(false)
              }}
            />
          ))}
        </div>
      </div>

      {/* Value inputs */}
      {type === "glucose" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="value1">{glucoseLabel}</Label>
          <Input
            id="value1"
            type="number"
            step="0.1"
            min="0"
            placeholder={glucosePlaceholder}
            value={value1}
            onChange={(e) => {
              setValue1(e.target.value)
              setUnitPrompt(null)
              setUnitDismissed(false)
              setPendingSubmit(false)
            }}
            onBlur={handleValue1Blur}
            required
          />
          {unitPrompt === "switch-to-mgdl" && (
            <div className="flex flex-col gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                This value looks like it may be in mg/dL. Switch to mg/dL?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleSwitchUnit("mg/dL")}
                  className="text-sm font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300"
                >
                  {pendingSubmit
                    ? "Switch to mg/dL & submit"
                    : "Switch to mg/dL"}
                </button>
                <button
                  type="button"
                  onClick={handleKeepUnit}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {pendingSubmit ? "Keep mmol/L & submit" : "Keep mmol/L"}
                </button>
              </div>
            </div>
          )}
          {unitPrompt === "switch-to-mmol" && (
            <div className="flex flex-col gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                This value looks like it may be in mmol/L. Switch to mmol/L?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleSwitchUnit("mmol/L")}
                  className="text-sm font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300"
                >
                  {pendingSubmit
                    ? "Switch to mmol/L & submit"
                    : "Switch to mmol/L"}
                </button>
                <button
                  type="button"
                  onClick={handleKeepUnit}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {pendingSubmit ? "Keep mg/dL & submit" : "Keep mg/dL"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="value1">Systolic (mmHg)</Label>
            <Input
              id="value1"
              type="number"
              min="0"
              placeholder="e.g. 120"
              value={value1}
              onChange={(e) => setValue1(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="value2">Diastolic (mmHg)</Label>
            <Input
              id="value2"
              type="number"
              min="0"
              placeholder="e.g. 80"
              value={value2}
              onChange={(e) => setValue2(e.target.value)}
              required
            />
          </div>
        </div>
      )}

      {/* Meal context — glucose only */}
      {type === "glucose" && (
        <div className="flex flex-col gap-2">
          <Label>Did you eat recently?</Label>
          <div className="grid grid-cols-2 gap-3">
            {MEAL_OPTIONS.map((m) => (
              <ChoiceCard
                key={m.value}
                value={m.value}
                selected={mealContext === m.value}
                icon={m.icon}
                label={m.label}
                sub={m.sub}
                onSelect={setMealContext}
              />
            ))}
          </div>
        </div>
      )}

      {/* When timestamp */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold tracking-wider uppercase">
          When?
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {WHEN_OPTIONS.map((w) => (
            <ChoiceCard
              key={w.value}
              value={w.value}
              selected={when === w.value}
              icon={w.icon}
              label={w.label}
              sub={w.sub}
              onSelect={setWhen}
            />
          ))}
        </div>
        {when === "custom" && (
          <div className="flex gap-2">
            <Popover open={customDateOpen} onOpenChange={setCustomDateOpen}>
              <PopoverTrigger
                type="button"
                className="flex h-10 flex-1 items-center justify-start gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-normal hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <RiCalendarLine className="size-4 shrink-0 text-muted-foreground" />
                {customDate ? (
                  formatDate(customDate)
                ) : (
                  <span className="text-muted-foreground">Select date</span>
                )}
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={customDate}
                  onSelect={(d) => {
                    setCustomDate(d)
                    setCustomDateOpen(false)
                  }}
                  disabled={{ after: new Date() }}
                />
              </PopoverContent>
            </Popover>

            <Select
              value={customTime}
              onValueChange={setCustomTime}
              items={Object.fromEntries(
                TIME_OPTIONS.map((t) => [t.value, t.label])
              )}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add your meal or anything relevant"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "Saving…" : "Log reading"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
