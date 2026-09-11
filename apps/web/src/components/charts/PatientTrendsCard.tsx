import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent } from "@/components/card"
import { apiClient } from "@/lib/api-client"
import type { components } from "@/lib/api.types"
import { formatGlucose, type GlucoseUnit } from "@/lib/glucose"
import {
  buildBPTrend,
  buildGlucoseTrend,
  glucoseTrendForUnit,
  inRangeCount,
  latestReading,
  sevenDaysFrom,
  type BPTrendDay,
  type GlucoseTrendDay,
} from "@/lib/patient-trends"
import { formatReadingValue } from "@/lib/readings"
import { cn } from "@/lib/utils"

type TrendType = "glucose" | "blood_pressure"
type Reading = components["schemas"]["Reading"]

interface PatientTrendsCardProps {
  enabled: boolean
  glucoseUnit: GlucoseUnit
}

export function PatientTrendsCard({
  enabled,
  glucoseUnit,
}: PatientTrendsCardProps) {
  const [type, setType] = useState<TrendType>("glucose")
  const { data, isError, isLoading } = useQuery({
    queryKey: ["patient-trends", type],
    queryFn: async () => {
      const response = await apiClient.GET("/patients/me/readings", {
        params: {
          query: { type, from: sevenDaysFrom(), limit: 200 },
        },
      })
      if (response.error) throw new Error("Unable to load trends")
      return response.data
    },
    enabled,
  })

  const readings = data?.data ?? []
  const latest = latestReading(readings)
  const inRange = inRangeCount(readings)
  const trend =
    type === "glucose"
      ? glucoseTrendForUnit(buildGlucoseTrend(readings), glucoseUnit)
      : buildBPTrend(readings)

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Your trends</h2>
            <p className="text-xs text-muted-foreground">Past 7 days</p>
          </div>
          <Link
            to="/patient/history"
            className="pt-0.5 text-sm text-primary underline underline-offset-2"
          >
            View history
          </Link>
        </div>

        <div className="flex rounded-md border border-border bg-muted/40 p-0.5">
          <TrendTab
            active={type === "glucose"}
            onClick={() => setType("glucose")}
          >
            Glucose
          </TrendTab>
          <TrendTab
            active={type === "blood_pressure"}
            onClick={() => setType("blood_pressure")}
          >
            Blood pressure
          </TrendTab>
        </div>

        {isLoading ? (
          <div className="h-44 animate-pulse rounded-md bg-muted" />
        ) : isError ? (
          <ChartMessage>Unable to load trends right now.</ChartMessage>
        ) : readings.length === 0 ? (
          <ChartMessage>
            No {type === "glucose" ? "glucose" : "blood pressure"} readings yet.{" "}
            <Link to="/patient/log">Log readings</Link> to see your trend.
          </ChartMessage>
        ) : type === "glucose" ? (
          <GlucoseTrend
            trend={trend as GlucoseTrendDay[]}
            latest={latest}
            inRange={inRange}
            total={readings.length}
            glucoseUnit={glucoseUnit}
          />
        ) : (
          <BPTrend
            trend={trend as BPTrendDay[]}
            latest={latest}
            inRange={inRange}
            total={readings.length}
          />
        )}
      </CardContent>
    </Card>
  )
}

function TrendTab({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-8 flex-1 rounded px-2 text-xs font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function GlucoseTrend({
  trend,
  latest,
  inRange,
  total,
  glucoseUnit,
}: {
  trend: GlucoseTrendDay[]
  latest?: Reading
  inRange: number
  total: number
  glucoseUnit: GlucoseUnit
}) {
  return (
    <>
      <TrendSummary
        latest={latest ? formatGlucose(latest.value1, glucoseUnit) : "-"}
        inRange={inRange}
        total={total}
      />
      <TrendLegend
        items={[
          ["Fasting", "bg-primary"],
          ["After meals", "bg-chart-1"],
        ]}
      />
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trend}
            margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip content={<GlucoseTooltip glucoseUnit={glucoseUnit} />} />
            <Line
              type="monotone"
              dataKey="fasted"
              stroke="var(--primary)"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={<HighDayDot series="fasted" />}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="postMeal"
              stroke="var(--chart-1)"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={<HighDayDot series="postMeal" />}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

function BPTrend({
  trend,
  latest,
  inRange,
  total,
}: {
  trend: BPTrendDay[]
  latest?: Reading
  inRange: number
  total: number
}) {
  return (
    <>
      <TrendSummary
        latest={latest ? formatReadingValue(latest) : "-"}
        inRange={inRange}
        total={total}
      />
      <TrendLegend
        items={[
          ["Systolic", "bg-primary"],
          ["Diastolic", "bg-chart-1"],
        ]}
      />
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trend}
            margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip content={<BPTooltip />} />
            <Line
              type="monotone"
              dataKey="systolic"
              stroke="var(--primary)"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="diastolic"
              stroke="var(--chart-1)"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

function TrendSummary({
  latest,
  inRange,
  total,
}: {
  latest: string
  inRange: number
  total: number
}) {
  return (
    <div className="flex items-center gap-4">
      <div>
        <p className="text-xs text-muted-foreground">Latest</p>
        <p className="text-lg font-semibold">{latest}</p>
      </div>
      <div className="h-8 w-px bg-border" />
      <div>
        <p className="text-xs text-muted-foreground">In range</p>
        <p className="text-sm font-semibold text-primary">
          {inRange} of {total}
        </p>
      </div>
    </div>
  )
}

function TrendLegend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={cn("h-0.5 w-3 rounded-full", color)} />
          {label}
        </span>
      ))}
    </div>
  )
}

function HighDayDot({
  cx,
  cy,
  payload,
  series,
}: {
  cx?: number
  cy?: number
  payload?: GlucoseTrendDay
  series: "fasted" | "postMeal"
}) {
  const highValue =
    series === "fasted" ? payload?.highFasted : payload?.highPostMeal
  if (highValue === undefined || cx === undefined || cy === undefined)
    return null
  return <circle cx={cx} cy={cy} r={3.5} fill="var(--destructive)" />
}

function GlucoseTooltip({
  active,
  payload,
  glucoseUnit,
}: {
  active?: boolean
  payload?: { payload: GlucoseTrendDay }[]
  glucoseUnit: GlucoseUnit
}) {
  if (!active || !payload?.[0]) return null
  const day = payload[0].payload

  return (
    <DayTooltip
      date={day.date}
      readings={day.readings}
      glucoseUnit={glucoseUnit}
    />
  )
}

function BPTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: BPTrendDay }[]
}) {
  if (!active || !payload?.[0]) return null
  const day = payload[0].payload

  return <DayTooltip date={day.date} readings={day.readings} />
}

function DayTooltip({
  date,
  readings,
  glucoseUnit = "mg/dL",
}: {
  date: string
  readings: Reading[]
  glucoseUnit?: GlucoseUnit
}) {
  return (
    <div className="max-w-48 rounded-md border border-border bg-card p-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{formatDate(date)}</p>
      {readings.length === 0 ? (
        <p className="text-muted-foreground">No readings</p>
      ) : (
        <div className="flex flex-col gap-1">
          {readings.map((reading) => (
            <div key={reading.id} className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {readingLabel(reading)}
              </span>
              <span
                className={cn(
                  "font-medium",
                  reading.severity === "high" && "text-destructive"
                )}
              >
                {formatReadingValue(reading, glucoseUnit)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChartMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-44 items-center justify-center rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function readingLabel(reading: Reading): string {
  if (reading.context === "fasted") return "Fasting"
  if (reading.context === "post_meal") return "After meals"
  return reading.context === "morning" ? "Morning" : "Evening"
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-TT", {
    month: "short",
    day: "numeric",
  })
}
