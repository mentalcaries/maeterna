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
import { getEffectiveThresholds } from "@/lib/thresholds"
import type { Thresholds } from "@/lib/thresholds"

interface BPChartProps {
  readings: Reading[]
  thresholdOverrides?: Partial<Thresholds>
}

export function BPChart({ readings, thresholdOverrides }: BPChartProps) {
  const thresholds = getEffectiveThresholds(thresholdOverrides)

  const data = readings
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
    }))

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No blood pressure readings available.
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
          unit=" mmHg"
          width={72}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `${value} mmHg`,
            name === "systolic" ? "Systolic" : "Diastolic",
          ]}
          contentStyle={{
            border: "1px solid var(--border)",
            borderRadius: "6px",
            fontSize: "12px",
          }}
        />
        <Legend iconType="line" wrapperStyle={{ fontSize: "11px" }} />
        <ReferenceLine
          y={thresholds.systolic_warning}
          stroke="#eab308"
          strokeDasharray="4 4"
        />
        <ReferenceLine
          y={thresholds.systolic_critical}
          stroke="#ef4444"
          strokeDasharray="4 4"
        />
        <Line
          type="monotone"
          dataKey="systolic"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--primary)" }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="diastolic"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--chart-1)" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
