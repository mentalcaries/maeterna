import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import {
  RiDropLine,
  RiHeartPulseLine,
  RiLeafLine,
  RiRestaurantLine,
  RiSunFoggyLine,
  RiMoonLine,
  RiMoonClearLine,
  RiHospitalLine,
  RiTimeLine,
  RiCalendarLine,
} from "@remixicon/react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@workspace/ui/components/popover"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@workspace/ui/components/select"
import type { ReadingType } from "@/mock/db"

type MealContext = "fasted" | "post_meal"
type BPContext = "morning" | "evening" | "before_bed" | "at_clinic"
type WhenOption = "now" | "custom"

export type ReadingBody = {
  type: "glucose" | "blood_pressure"
  value1: number
  value2?: number | null
  context: string
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

const READING_TYPES: {
  value: ReadingType
  label: string
  unit: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    value: "glucose",
    label: "Blood Glucose",
    unit: "mmol/L",
    icon: RiDropLine,
  },
  {
    value: "blood_pressure",
    label: "Blood Pressure",
    unit: "mmHg",
    icon: RiHeartPulseLine,
  },
]

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

const BP_CONTEXT_OPTIONS: {
  value: BPContext
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: "morning", label: "Morning", icon: RiSunFoggyLine },
  { value: "evening", label: "Evening", icon: RiMoonLine },
  { value: "before_bed", label: "Before bed", icon: RiMoonClearLine },
  { value: "at_clinic", label: "At clinic", icon: RiHospitalLine },
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
  const [bpContext, setBpContext] = useState<BPContext>("morning")
  const [when, setWhen] = useState<WhenOption>("now")
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
  const [customTime, setCustomTime] = useState<string>("06:00")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const v1 = parseFloat(value1)
    if (isNaN(v1) || v1 <= 0) {
      setError("Please enter a valid reading value.")
      return
    }

    let timestamp: string
    if (when === "now") {
      timestamp = new Date().toISOString()
    } else {
      if (!customDate) {
        setError("Please select a date.")
        return
      }
      const [h] = customTime.split(":").map(Number)
      const dt = new Date(customDate)
      dt.setHours(h, 0, 0, 0)
      timestamp = dt.toISOString()
    }

    let body: ReadingBody
    if (type === "blood_pressure") {
      const v2 = parseFloat(value2)
      if (isNaN(v2) || v2 <= 0) {
        setError("Please enter a valid diastolic value.")
        return
      }
      body = {
        type: "blood_pressure",
        value1: v1,
        value2: v2,
        context: bpContext,
        notes: notes.trim() || null,
        timestamp,
      }
    } else {
      body = {
        type: "glucose",
        value1: v1,
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
      onSuccess?.()
    } catch {
      setError("Failed to save reading. Please try again.")
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-6"
    >
      {/* Reading type */}
      <div className="flex flex-col gap-2">
        <Label>What are you measuring?</Label>
        <div className="grid grid-cols-2 gap-3">
          {READING_TYPES.map((t) => (
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
              }}
            />
          ))}
        </div>
      </div>

      {/* Value inputs */}
      {type === "glucose" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="value1">Reading (mmol/L)</Label>
          <Input
            id="value1"
            type="number"
            step="0.1"
            min="0"
            placeholder="e.g. 5.4"
            value={value1}
            onChange={(e) => setValue1(e.target.value)}
            required
          />
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

      {/* BP context — blood pressure only */}
      {type === "blood_pressure" && (
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-semibold tracking-wider uppercase">
            When was this taken?
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {BP_CONTEXT_OPTIONS.map((b) => (
              <ChoiceCard
                key={b.value}
                value={b.value}
                selected={bpContext === b.value}
                icon={b.icon}
                label={b.label}
                onSelect={setBpContext}
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
            <Popover>
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
                  onSelect={setCustomDate}
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
          placeholder="Any relevant context..."
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
