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

interface BPChartProps {
  readings: Reading[]
  thresholdOverrides?: Partial<Thresholds>
}

interface BPPoint {
  date: string
  systolic?: number
  diastolic?: number
  severity: SeverityType
}

function BPDot({
  cx,
  cy,
  payload,
}: {
  cx?: number
  cy?: number
  payload?: BPPoint
}) {
  if (cx === undefined || cy === undefined || !payload) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={SEVERITY_COLORS[payload.severity]}
      stroke="var(--card)"
      strokeWidth={2}
    />
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

export function BPChart({ readings, thresholdOverrides }: BPChartProps) {
  const thresholds = getEffectiveThresholds(thresholdOverrides)

  const data: BPPoint[] = readings
    .filter((r) => r.type === "blood_pressure")
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    .map((r) => ({
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
            dot={<BPDot />}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="diastolic"
            name="Diastolic"
            stroke="var(--chart-1)"
            strokeWidth={1.5}
            dot={<BPDot />}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <BPSeverityLegend />
    </div>
  )
}
