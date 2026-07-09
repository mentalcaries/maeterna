import { useCallback, useEffect, useState } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
import { useElementWidth } from "@/hooks/useElementWidth"

interface BPChartProps {
  readings: Reading[]
  thresholdOverrides?: Partial<Thresholds>
  highlightedReadingId?: string | null
}

const LABEL_HALF_WIDTH = 65
const LABEL_ABOVE_OFFSET = 52
const LABEL_BELOW_OFFSET = 14
const LABEL_FLIP_THRESHOLD = 60

interface BPPoint {
  id: string
  date: string
  systolic?: number
  diastolic?: number
  severity: SeverityType
}

interface HighlightPosition {
  cx: number
  cy: number
  point: BPPoint
}

function BPDot({
  cx,
  cy,
  payload,
  seriesKey,
  highlightedReadingId,
  onHighlightPosition,
}: {
  cx?: number
  cy?: number
  payload?: BPPoint
  seriesKey: "systolic" | "diastolic"
  highlightedReadingId?: string | null
  onHighlightPosition: (pos: HighlightPosition) => void
}) {
  const isHighlighted =
    !!payload &&
    highlightedReadingId != null &&
    payload.id === highlightedReadingId

  useEffect(() => {
    if (
      isHighlighted &&
      seriesKey === "systolic" &&
      cx !== undefined &&
      cy !== undefined &&
      payload
    ) {
      onHighlightPosition({ cx, cy, point: payload })
    }
  }, [isHighlighted, seriesKey, cx, cy, payload, onHighlightPosition])

  if (cx === undefined || cy === undefined || !payload) return null
  const marker = (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={SEVERITY_COLORS[payload.severity]}
      stroke="var(--card)"
      strokeWidth={2}
    />
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

function BPTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: BPPoint }[]
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]!.payload
  return (
    <div className="rounded-md border border-border bg-card p-2 text-xs shadow-md">
      <p className="font-medium">
        {p.systolic}/{p.diastolic} mmHg
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

function BPHighlightLabel({
  pos,
  containerWidth,
}: {
  pos: HighlightPosition
  containerWidth: number
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
        {pos.point.systolic}/{pos.point.diastolic} mmHg
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

function BPSeverityLegend() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
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
    </div>
  )
}

export function BPChart({
  readings,
  thresholdOverrides,
  highlightedReadingId,
}: BPChartProps) {
  const thresholds = getEffectiveThresholds(thresholdOverrides)
  const [containerRef, containerWidth] = useElementWidth<HTMLDivElement>()
  const [highlightPos, setHighlightPos] = useState<HighlightPosition | null>(
    null
  )
  const handleHighlightPosition = useCallback(
    (pos: HighlightPosition) => setHighlightPos(pos),
    []
  )

  const data: BPPoint[] = readings
    .filter((r) => r.type === "blood_pressure")
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
      systolic: r.value1,
      diastolic: r.value2,
      severity: r.severity,
    }))

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No blood pressure readings available.
      </div>
    )
  }

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
              domain={["auto", "auto"]}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              unit=" mmHg"
              width={72}
            />
            <Tooltip content={<BPTooltip />} />
            <Legend iconType="line" wrapperStyle={{ fontSize: "11px" }} />
            <ReferenceLine
              y={thresholds.systolicHigh}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              label={{
                value: `systolic limit ${thresholds.systolicHigh}`,
                fontSize: 10,
                fill: "var(--muted-foreground)",
                position: "insideTopLeft",
              }}
            />
            <ReferenceLine
              y={thresholds.diastolicHigh}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              label={{
                value: `diastolic limit ${thresholds.diastolicHigh}`,
                fontSize: 10,
                fill: "var(--muted-foreground)",
                position: "insideBottomLeft",
              }}
            />
            <Line
              type="monotone"
              dataKey="systolic"
              name="Systolic"
              stroke="var(--primary)"
              strokeWidth={1.5}
              dot={(dotProps: {
                cx?: number
                cy?: number
                payload?: BPPoint
              }) => (
                <BPDot
                  {...dotProps}
                  key={dotProps.payload?.id}
                  seriesKey="systolic"
                  highlightedReadingId={highlightedReadingId}
                  onHighlightPosition={handleHighlightPosition}
                />
              )}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="diastolic"
              name="Diastolic"
              stroke="var(--chart-1)"
              strokeWidth={1.5}
              dot={(dotProps: {
                cx?: number
                cy?: number
                payload?: BPPoint
              }) => (
                <BPDot
                  {...dotProps}
                  key={dotProps.payload?.id}
                  seriesKey="diastolic"
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
          <BPHighlightLabel
            pos={highlightPos}
            containerWidth={containerWidth}
          />
        )}
      </div>
      <BPSeverityLegend />
    </div>
  )
}
