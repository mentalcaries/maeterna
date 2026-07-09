import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { Reading } from "@/mock/db"
import {
  getEffectiveThresholds,
  SEVERITY_COLORS,
  type SeverityType,
  type Thresholds,
} from "@/lib/thresholds"
import { mgdlToMmol } from "@/lib/glucose"

interface GlucoseChartProps {
  readings: Reading[]
  thresholdOverrides?: Partial<Thresholds>
  displayUnit?: "mg/dL" | "mmol/L"
}

const GLUCOSE_FLOOR_MGDL = 65

interface GlucosePoint {
  date: string
  value: number
  context: string
  severity: SeverityType
}

function GlucoseDot({
  cx,
  cy,
  payload,
}: {
  cx?: number
  cy?: number
  payload?: GlucosePoint
}) {
  if (cx === undefined || cy === undefined || !payload) return null
  const color = SEVERITY_COLORS[payload.severity]
  const ring = { stroke: "var(--card)", strokeWidth: 2 }
  if (payload.context === "post_meal") {
    const s = 5.5
    return (
      <polygon
        points={`${cx},${cy - s} ${cx + s},${cy + s} ${cx - s},${cy + s}`}
        fill={color}
        {...ring}
      />
    )
  }
  return <circle cx={cx} cy={cy} r={5} fill={color} {...ring} />
}

function GlucoseTooltip({
  active,
  payload,
  displayUnit,
}: {
  active?: boolean
  payload?: { payload: GlucosePoint }[]
  displayUnit: "mg/dL" | "mmol/L"
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]!.payload
  return (
    <div className="rounded-md border border-border bg-card p-2 text-xs shadow-md">
      <p className="font-medium">
        {p.value} {displayUnit}
      </p>
      <p className="text-muted-foreground">
        {p.context === "post_meal" ? "Post-meal" : "Fasted"}
      </p>
      <p
        className={
          p.severity === "high"
            ? "font-medium text-red-600 dark:text-red-400"
            : "font-medium text-green-600 dark:text-green-400"
        }
      >
        {p.severity === "high" ? "High" : "Normal"}
      </p>
    </div>
  )
}

function GlucoseLegend() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4.5" fill="currentColor" />
        </svg>
        Fasted
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <polygon points="5,0.5 9.5,9.5 0.5,9.5" fill="currentColor" />
        </svg>
        Post-meal
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block size-2.5 rounded-full"
          style={{ background: SEVERITY_COLORS.normal }}
        />
        Normal
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block size-2.5 rounded-full"
          style={{ background: SEVERITY_COLORS.high }}
        />
        High
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-4 rounded-sm"
          style={{ background: "var(--chart-2)", opacity: 0.5 }}
        />
        Normal range
      </span>
    </div>
  )
}

export function GlucoseChart({
  readings,
  thresholdOverrides,
  displayUnit = "mg/dL",
}: GlucoseChartProps) {
  const thresholds = getEffectiveThresholds(thresholdOverrides)

  const convertValue = (v: number) =>
    displayUnit === "mmol/L" ? mgdlToMmol(v) : v

  const data: GlucosePoint[] = readings
    .filter((r) => r.type === "glucose")
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    .map((r) => ({
      date: new Date(r.timestamp).toLocaleDateString("en-TT", {
        month: "short",
        day: "numeric",
      }),
      value: convertValue(r.value1),
      context: r.context,
      severity: r.severity,
    }))

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No glucose readings available.
      </div>
    )
  }

  const floor = convertValue(GLUCOSE_FLOOR_MGDL)
  const fastingHigh = convertValue(thresholds.fastingGlucoseHigh)
  const postMealHigh = convertValue(thresholds.postMealGlucoseHigh)

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={data}
          margin={{ top: 24, right: 16, left: 0, bottom: 28 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
          />
          <YAxis
            domain={[floor, "auto"]}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            unit={displayUnit === "mmol/L" ? " mmol/L" : " mg/dL"}
            width={72}
          />
          <Tooltip
            content={<GlucoseTooltip displayUnit={displayUnit} />}
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
          />
          <ReferenceArea
            y1={floor}
            y2={postMealHigh}
            fill="var(--chart-2)"
            fillOpacity={0.08}
            ifOverflow="extendDomain"
          />
          <ReferenceArea
            y1={floor}
            y2={fastingHigh}
            fill="var(--chart-2)"
            fillOpacity={0.18}
            ifOverflow="extendDomain"
          />
          <ReferenceLine
            y={fastingHigh}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: `Fasted ${fastingHigh}`,
              fontSize: 10,
              fill: "var(--muted-foreground)",
              position: "insideTopLeft",
            }}
          />
          <ReferenceLine
            y={postMealHigh}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: `PP ${postMealHigh}`,
              fontSize: 10,
              fill: "var(--muted-foreground)",
              position: "insideTopLeft",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--muted-foreground)"
            strokeWidth={1.5}
            dot={<GlucoseDot />}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <GlucoseLegend />
    </div>
  )
}
