import * as React from "react"
import { DayPicker } from "react-day-picker"
import type { DayPickerProps } from "react-day-picker"
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react"
import { cn } from "@workspace/ui/lib/utils"

export function Calendar({
  className,
  classNames,
  components,
  ...props
}: DayPickerProps) {
  return (
    <DayPicker
      className={cn("p-1", className)}
      classNames={{
        months: "flex flex-col",
        month_caption: "relative mx-9 flex items-center justify-center pb-2",
        caption_label: "text-sm font-semibold",
        nav: "absolute inset-x-0 flex items-center justify-between",
        month_grid: "w-full",
        weekdays: "flex",
        weekday:
          "flex h-9 w-9 items-center justify-center text-xs font-normal text-muted-foreground",
        weeks: "flex flex-col gap-1 mt-1",
        week: "flex",
        day: "relative p-0 text-center",
        day_button:
          "h-9 w-9 rounded-md text-sm font-normal hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:font-semibold [&>button]:underline",
        outside: "opacity-40",
        disabled: "pointer-events-none opacity-30",
        ...classNames,
      }}
      components={{
        PreviousMonthButton: ({ className: c, ...p }) => (
          <button
            className={cn(
              "absolute left-0 flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent",
              c
            )}
            {...p}
          >
            <RiArrowLeftSLine className="size-4" />
          </button>
        ),
        NextMonthButton: ({ className: c, ...p }) => (
          <button
            className={cn(
              "absolute right-0 flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent",
              c
            )}
            {...p}
          >
            <RiArrowRightSLine className="size-4" />
          </button>
        ),
        ...components,
      }}
      {...props}
    />
  )
}
