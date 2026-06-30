import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { Reading } from "@/mock/db"
import { DEFAULT_THRESHOLDS, getEffectiveThresholds } from "@/lib/thresholds"
import type { Thresholds } from "@/lib/thresholds"
import { mgdlToMmol } from "@/lib/glucose"

interface GlucoseChartProps {
  readings: Reading[]
  thresholdOverrides?: Partial<Thresholds>
  displayUnit?: "mg/dL" | "mmol/L"
}

export function GlucoseChart({
  readings,
  thresholdOverrides,
  displayUnit = "mg/dL",
}: GlucoseChartProps) {
  const thresholds = getEffectiveThresholds(thresholdOverrides)

  const convertValue = (v: number) =>
    displayUnit === "mmol/L" ? mgdlToMmol(v) : v

  const data = readings
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
    }))

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No glucose readings available.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          unit={displayUnit === "mmol/L" ? " mmol/L" : " mg/dL"}
          width={72}
        />
        <Tooltip
          formatter={(value: number) => [`${value} ${displayUnit}`, "Glucose"]}
          contentStyle={{
            border: "1px solid var(--border)",
            borderRadius: "6px",
            fontSize: "12px",
          }}
        />
        <ReferenceLine
          y={convertValue(DEFAULT_THRESHOLDS.fasting_glucose_warning)}
          stroke="#eab308"
          strokeDasharray="4 4"
          label={{ value: "warn", fill: "#eab308", fontSize: 10 }}
        />
        <ReferenceLine
          y={convertValue(thresholds.fasting_glucose_critical)}
          stroke="#ef4444"
          strokeDasharray="4 4"
          label={{ value: "crit", fill: "#ef4444", fontSize: 10 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--primary)" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
