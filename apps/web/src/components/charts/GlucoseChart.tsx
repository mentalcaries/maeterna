import { useCallback, useEffect, useState } from "react"
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
import { useElementWidth } from "@/hooks/useElementWidth"

interface GlucoseChartProps {
  readings: Reading[]
  thresholdOverrides?: Partial<Thresholds>
  displayUnit?: "mg/dL" | "mmol/L"
  highlightedReadingId?: string | null
  contextFilter?: "all" | "fasted" | "post_meal"
}

const GLUCOSE_FLOOR_MGDL = 65
const LABEL_HALF_WIDTH = 65
const LABEL_ABOVE_OFFSET = 66
const LABEL_BELOW_OFFSET = 14
const LABEL_FLIP_THRESHOLD = 70

interface GlucosePoint {
  id: string
  date: string
  value: number
  context: string
  severity: SeverityType
}

interface HighlightPosition {
  cx: number
  cy: number
  point: GlucosePoint
}

function GlucoseDot({
  cx,
  cy,
  payload,
  highlightedReadingId,
  onHighlightPosition,
}: {
  cx?: number
  cy?: number
  payload?: GlucosePoint
  highlightedReadingId?: string | null
  onHighlightPosition: (pos: HighlightPosition) => void
}) {
  const isHighlighted =
    !!payload &&
    highlightedReadingId != null &&
    payload.id === highlightedReadingId

  useEffect(() => {
    if (isHighlighted && cx !== undefined && cy !== undefined && payload) {
      onHighlightPosition({ cx, cy, point: payload })
    }
  }, [isHighlighted, cx, cy, payload, onHighlightPosition])

  if (cx === undefined || cy === undefined || !payload) return null
  const color = SEVERITY_COLORS[payload.severity]
  const ring = { stroke: "var(--card)", strokeWidth: 2 }
  const marker =
    payload.context === "post_meal" ? (
      (() => {
        const s = 5.5
        return (
          <polygon
            points={`${cx},${cy - s} ${cx + s},${cy + s} ${cx - s},${cy + s}`}
            fill={color}
            {...ring}
          />
        )
      })()
    ) : (
      <circle cx={cx} cy={cy} r={5} fill={color} {...ring} />
    )

  if (!isHighlighted) return marker
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={9}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2}
      />
      {marker}
    </g>
  )
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

function GlucoseHighlightLabel({
  pos,
  containerWidth,
  displayUnit,
}: {
  pos: HighlightPosition
  containerWidth: number
  displayUnit: "mg/dL" | "mmol/L"
}) {
  const left =
    containerWidth > 0
      ? Math.min(
          Math.max(pos.cx, LABEL_HALF_WIDTH),
          containerWidth - LABEL_HALF_WIDTH
        )
      : pos.cx
  const showAbove = pos.cy > LABEL_FLIP_THRESHOLD
  const top = showAbove
    ? pos.cy - LABEL_ABOVE_OFFSET
    : pos.cy + LABEL_BELOW_OFFSET

  return (
    <div
      className="pointer-events-none absolute rounded-md border border-border bg-card p-2 text-xs shadow-md"
      style={{ left, top, transform: "translateX(-50%)" }}
    >
      <p className="font-medium">
        {pos.point.value} {displayUnit}
      </p>
      <p className="text-muted-foreground">
        {pos.point.context === "post_meal" ? "Post-meal" : "Fasted"}
      </p>
      <p
        className={
          pos.point.severity === "high"
            ? "font-medium text-red-600 dark:text-red-400"
            : "font-medium text-green-600 dark:text-green-400"
        }
      >
        {pos.point.severity === "high" ? "High" : "Normal"}
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
  highlightedReadingId,
  contextFilter = "all",
}: GlucoseChartProps) {
  const thresholds = getEffectiveThresholds(thresholdOverrides)
  const [containerRef, containerWidth] = useElementWidth<HTMLDivElement>()
  const [highlightPos, setHighlightPos] = useState<HighlightPosition | null>(
    null
  )
  const handleHighlightPosition = useCallback(
    (pos: HighlightPosition) => setHighlightPos(pos),
    []
  )

  const convertValue = (v: number) =>
    displayUnit === "mmol/L" ? mgdlToMmol(v) : v

  const data: GlucosePoint[] = readings
    .filter(
      (r) =>
        r.type === "glucose" &&
        (contextFilter === "all" || r.context === contextFilter)
    )
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    .map((r) => ({
      id: r.id,
      date: new Date(r.timestamp).toLocaleDateString("en-TT", {
        month: "short",
        day: "numeric",
      }),
      value: convertValue(r.value1),
      context: r.context,
      severity: r.severity,
    }))

  if (data.length === 0) {
    const emptyLabel =
      contextFilter === "all"
        ? "glucose"
        : contextFilter === "post_meal"
          ? "post-meal"
          : "fasted"
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No {emptyLabel} readings available.
      </div>
    )
  }

  const floor = convertValue(GLUCOSE_FLOOR_MGDL)
  const fastingHigh = convertValue(thresholds.fastingGlucoseHigh)
  const postMealHigh = convertValue(thresholds.postMealGlucoseHigh)

  const showHighlight =
    !!highlightPos &&
    highlightedReadingId != null &&
    highlightPos.point.id === highlightedReadingId

  return (
    <div>
      <div ref={containerRef} className="relative">
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
              dot={(dotProps: {
                cx?: number
                cy?: number
                payload?: GlucosePoint
              }) => (
                <GlucoseDot
                  {...dotProps}
                  key={dotProps.payload?.id}
                  highlightedReadingId={highlightedReadingId}
                  onHighlightPosition={handleHighlightPosition}
                />
              )}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
        {showHighlight && (
          <GlucoseHighlightLabel
            pos={highlightPos}
            containerWidth={containerWidth}
            displayUnit={displayUnit}
          />
        )}
      </div>
      <GlucoseLegend />
    </div>
  )
}
