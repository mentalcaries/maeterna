import { useState } from "react"
import { RiCalendarLine } from "@remixicon/react"
import { Calendar } from "@/components/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select"

const TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const h24 = String(hour).padStart(2, "0")
  const period = hour < 12 ? "AM" : "PM"
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return { value: `${h24}:00`, label: `${h12}:00 ${period}` }
})

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function ReadingDateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
}: {
  date: Date | undefined
  time: string
  onDateChange: (date: Date | undefined) => void
  onTimeChange: (time: string) => void
}) {
  const [dateOpen, setDateOpen] = useState(false)

  return (
    <div className="flex gap-2">
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger
          type="button"
          className="flex h-10 min-w-0 flex-1 items-center justify-start gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-normal hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <RiCalendarLine className="size-4 shrink-0 text-muted-foreground" />
          {date ? (
            formatDate(date)
          ) : (
            <span className="text-muted-foreground">Select date</span>
          )}
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(nextDate) => {
              onDateChange(nextDate)
              setDateOpen(false)
            }}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>

      <Select
        value={time}
        onValueChange={onTimeChange}
        items={Object.fromEntries(
          TIME_OPTIONS.map((option) => [option.value, option.label])
        )}
      >
        <SelectTrigger className="w-32 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
