import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import { Button } from "@/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card"
import { Badge } from "@/components/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/dialog"
import { Input } from "@/components/input"
import { Label } from "@/components/label"
import { Textarea } from "@/components/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table"
import { Separator } from "@/components/separator"
import { apiClient } from "@/lib/api-client"
import type { components } from "@/lib/api.types"
import { ReadingBadge } from "@/components/readings/ReadingBadge"
import { ReadingForm } from "@/components/readings/ReadingForm"
import type { ReadingBody } from "@/components/readings/ReadingForm"
import { GlucoseChart } from "@/components/charts/GlucoseChart"
import { BPChart } from "@/components/charts/BPChart"
import {
  RiArrowLeftLine,
  RiDownloadLine,
  RiAddLine,
  RiFileExcel2Line,
  RiFilePdfLine,
} from "@remixicon/react"
import { DEFAULT_THRESHOLDS } from "@/lib/thresholds"
import type { Thresholds, AlertSeverity } from "@/lib/thresholds"
import type { Reading } from "@/mock/db"

export const Route = createFileRoute("/doctor/patients/$id")({
  component: PatientDetailPage,
})

type ApiReading = components["schemas"]["Reading"]
type ApiThresholds = components["schemas"]["Thresholds"]

function adaptReading(r: ApiReading): Reading {
  return {
    id: r.id,
    patientId: r.patientId,
    loggedById: r.loggedById,
    type: r.type,
    value1: r.value1,
    value2: r.value2 ?? undefined,
    unit: r.unit,
    context: r.context as import("@/mock/db").ReadingContext,
    notes: r.notes ?? undefined,
    timestamp: r.timestamp,
    severity:
      r.severity === "normal" ? undefined : (r.severity as AlertSeverity),
  }
}

function apiThresholdsToLocal(t: ApiThresholds): Thresholds {
  return {
    fasting_glucose_warning: t.fastingGlucoseWarning,
    fasting_glucose_critical: t.fastingGlucoseCritical,
    postmeal_glucose_warning: t.postMealGlucoseWarning,
    postmeal_glucose_critical: t.postMealGlucoseCritical,
    systolic_warning: t.systolicWarning,
    systolic_critical: t.systolicCritical,
    diastolic_warning: t.diastolicWarning,
    diastolic_critical: t.diastolicCritical,
  }
}

function localThresholdsToApi(t: Thresholds): ApiThresholds {
  return {
    fastingGlucoseWarning: t.fasting_glucose_warning,
    fastingGlucoseCritical: t.fasting_glucose_critical,
    postMealGlucoseWarning: t.postmeal_glucose_warning,
    postMealGlucoseCritical: t.postmeal_glucose_critical,
    systolicWarning: t.systolic_warning,
    systolicCritical: t.systolic_critical,
    diastolicWarning: t.diastolic_warning,
    diastolicCritical: t.diastolic_critical,
  }
}

const MEAL_LABELS: Record<string, string> = {
  fasted: "Fasted",
  post_meal: "After eating",
}
const TIME_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  before_bed: "Night",
  at_clinic: "At clinic",
}
const CONTEXT_LABELS: Record<string, string> = {
  fasting: "Fasting",
  post_meal: "After eating",
  morning: "Morning",
  before_bed: "Night",
}

function readingContext(r: {
  context: string
  mealContext?: string
  timeOfDay?: string
}): string {
  const parts: string[] = []
  if (r.mealContext) parts.push(MEAL_LABELS[r.mealContext] ?? r.mealContext)
  if (r.timeOfDay) parts.push(TIME_LABELS[r.timeOfDay] ?? r.timeOfDay)
  if (parts.length === 0) parts.push(CONTEXT_LABELS[r.context] ?? r.context)
  return parts.join(" · ")
}

function toLocalDateStr(d: Date): string {
  return d.toLocaleDateString("en-TT", { month: "short", day: "numeric" })
}

function toLocalTimeStr(d: Date): string {
  return d.toLocaleTimeString("en-TT", { hour: "2-digit", minute: "2-digit" })
}

function PatientDetailPage() {
  const { id: patientId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [noteTarget, setNoteTarget] = useState<ApiReading | null>(null)
  const [noteText, setNoteText] = useState("")
  const [noteOpen, setNoteOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [thresholdOpen, setThresholdOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const { data: patientDetail, isPending } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const res = await apiClient.GET("/doctors/me/patients/{patientId}", {
        params: { path: { patientId } },
      })
      return res.data ?? null
    },
  })

  const patient = patientDetail?.patient
  const apiReadings = patientDetail?.readings ?? []
  const apiThresholds = patientDetail?.thresholds ?? null
  const localThresholds = apiThresholds
    ? apiThresholdsToLocal(apiThresholds)
    : DEFAULT_THRESHOLDS

  const [thresholdForm, setThresholdForm] = useState<
    Record<keyof Thresholds, string>
  >(() => ({
    fasting_glucose_warning: String(localThresholds.fasting_glucose_warning),
    fasting_glucose_critical: String(localThresholds.fasting_glucose_critical),
    postmeal_glucose_warning: String(localThresholds.postmeal_glucose_warning),
    postmeal_glucose_critical: String(
      localThresholds.postmeal_glucose_critical
    ),
    systolic_warning: String(localThresholds.systolic_warning),
    systolic_critical: String(localThresholds.systolic_critical),
    diastolic_warning: String(localThresholds.diastolic_warning),
    diastolic_critical: String(localThresholds.diastolic_critical),
  }))

  const noteMutation = useMutation({
    mutationFn: ({ readingId, notes }: { readingId: string; notes: string }) =>
      apiClient.PATCH("/readings/{readingId}/notes", {
        params: { path: { readingId } },
        body: { notes },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["patient", patientId] })
      setNoteOpen(false)
      setNoteTarget(null)
      setNoteText("")
    },
  })

  const logMutation = useMutation({
    mutationFn: (body: ReadingBody) =>
      apiClient.POST("/patients/{patientId}/readings", {
        params: { path: { patientId } },
        body,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["patient", patientId] })
      void queryClient.invalidateQueries({ queryKey: ["doctor-patients"] })
      setLogOpen(false)
    },
  })

  const thresholdMutation = useMutation({
    mutationFn: (body: ApiThresholds) =>
      apiClient.PUT("/doctors/me/patients/{patientId}/thresholds", {
        params: { path: { patientId } },
        body,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["patient", patientId] })
      setThresholdOpen(false)
    },
  })

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void navigate({ to: "/doctor/dashboard" })}
        >
          <RiArrowLeftLine className="mr-1 size-3.5" />
          Back
        </Button>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void navigate({ to: "/doctor/dashboard" })}
        >
          <RiArrowLeftLine className="mr-1 size-3.5" />
          Back
        </Button>
        <p className="text-sm text-muted-foreground">Patient not found.</p>
      </div>
    )
  }

  const allReadings = apiReadings.map(adaptReading)
  const alerts = allReadings.filter((r) => r.severity !== undefined)
  const patientName = `${patient.firstName} ${patient.lastName}`

  function handleSaveNote() {
    if (!noteTarget || !noteText.trim()) return
    noteMutation.mutate({ readingId: noteTarget.id, notes: noteText.trim() })
  }

  function handleSaveThresholds() {
    const parsed: Thresholds = {
      fasting_glucose_warning: parseFloat(
        thresholdForm.fasting_glucose_warning
      ),
      fasting_glucose_critical: parseFloat(
        thresholdForm.fasting_glucose_critical
      ),
      postmeal_glucose_warning: parseFloat(
        thresholdForm.postmeal_glucose_warning
      ),
      postmeal_glucose_critical: parseFloat(
        thresholdForm.postmeal_glucose_critical
      ),
      systolic_warning: parseFloat(thresholdForm.systolic_warning),
      systolic_critical: parseFloat(thresholdForm.systolic_critical),
      diastolic_warning: parseFloat(thresholdForm.diastolic_warning),
      diastolic_critical: parseFloat(thresholdForm.diastolic_critical),
    }
    thresholdMutation.mutate(localThresholdsToApi(parsed))
  }

  function handleExportExcel() {
    setExportOpen(false)
    const rows = allReadings.map((r) => {
      const d = new Date(r.timestamp)
      return {
        Date: toLocalDateStr(d),
        Time: toLocalTimeStr(d),
        Type: r.type === "blood_pressure" ? "Blood Pressure" : "Glucose",
        Value:
          r.type === "blood_pressure"
            ? `${r.value1}/${r.value2 ?? "?"}`
            : String(r.value1),
        Unit: r.unit,
        Context: readingContext(r),
        Notes: r.notes ?? "",
        Status: r.severity ?? "Normal",
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Readings")
    XLSX.writeFile(wb, `${patientName.replace(/\s+/g, "_")}_readings.xlsx`)
  }

  function handleExportPDF() {
    setExportOpen(false)
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    })

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text(`${patientName} — Reading History`, 14, 12)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(`Exported ${new Date().toLocaleDateString("en-TT")}`, 14, 18)

    const headers = [
      "Date",
      "Time",
      "Type",
      "Value",
      "Unit",
      "Context",
      "Notes",
      "Status",
    ]
    const colW = [24, 15, 30, 22, 14, 36, 82, 18]
    const totalW = colW.reduce((a, b) => a + b, 0)
    const startX = 14
    const rowH = 6.5
    const pageH = 200

    function drawHeader(yPos: number) {
      doc.setFillColor(243, 244, 246)
      doc.rect(startX, yPos, totalW, rowH, "F")
      doc.setFontSize(7)
      doc.setFont("helvetica", "bold")
      let x = startX
      headers.forEach((h, i) => {
        doc.text(h, x + 1.5, yPos + 4.5)
        x += colW[i]!
      })
    }

    function fitText(text: string, maxW: number): string {
      if (doc.getTextWidth(text) <= maxW) return text
      let t = text
      while (t.length > 0 && doc.getTextWidth(t + "…") > maxW) {
        t = t.slice(0, -1)
      }
      return t + "…"
    }

    let y = 24
    drawHeader(y)
    y += rowH

    allReadings.forEach((r, ri) => {
      if (y + rowH > pageH) {
        doc.addPage()
        y = 14
        drawHeader(y)
        y += rowH
      }

      if (ri % 2 === 0) {
        doc.setFillColor(249, 250, 251)
        doc.rect(startX, y, totalW, rowH, "F")
      }

      const d = new Date(r.timestamp)
      const cells = [
        toLocalDateStr(d),
        toLocalTimeStr(d),
        r.type === "blood_pressure" ? "Blood Pressure" : "Glucose",
        r.type === "blood_pressure"
          ? `${r.value1}/${r.value2 ?? "?"}`
          : String(r.value1),
        r.unit,
        readingContext(r),
        r.notes ?? "",
        r.severity ?? "Normal",
      ]

      doc.setFontSize(7)
      doc.setFont("helvetica", "normal")
      let x = startX
      cells.forEach((cell, ci) => {
        const maxW = colW[ci]! - 3
        doc.text(fitText(cell, maxW), x + 1.5, y + 4.5)
        x += colW[ci]!
      })

      y += rowH
    })

    doc.save(`${patientName.replace(/\s+/g, "_")}_readings.pdf`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void navigate({ to: "/doctor/dashboard" })}
        >
          <RiArrowLeftLine className="mr-1 size-3.5" />
          All patients
        </Button>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportOpen((v) => !v)}
            >
              <RiDownloadLine className="mr-1 size-3.5" />
              Export
            </Button>
            {exportOpen && (
              <div className="absolute top-full right-0 z-10 mt-1 min-w-[160px] rounded-lg border border-border bg-background p-1 shadow-md">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                  onClick={handleExportExcel}
                >
                  <RiFileExcel2Line className="size-4 text-green-600" />
                  Export as Excel
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                  onClick={handleExportPDF}
                >
                  <RiFilePdfLine className="size-4 text-red-500" />
                  Export as PDF
                </button>
              </div>
            )}
          </div>
          <Button size="sm" onClick={() => setLogOpen(true)}>
            <RiAddLine className="mr-1 size-3.5" />
            Log reading
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{patientName}</h1>
          {patient.status === "suspended" && (
            <Badge variant="destructive">Suspended</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{patient.email}</p>
        {alerts.length > 0 && (
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant={
                alerts.some((r) => r.severity === "critical")
                  ? "critical"
                  : "warning"
              }
            >
              {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
            </Badge>
            <span className="text-xs text-muted-foreground">
              in reading history
            </span>
          </div>
        )}
      </div>

      <Tabs defaultValue="glucose">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="glucose">Glucose</TabsTrigger>
            <TabsTrigger value="bp">Blood Pressure</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              setThresholdForm({
                fasting_glucose_warning: String(
                  localThresholds.fasting_glucose_warning
                ),
                fasting_glucose_critical: String(
                  localThresholds.fasting_glucose_critical
                ),
                postmeal_glucose_warning: String(
                  localThresholds.postmeal_glucose_warning
                ),
                postmeal_glucose_critical: String(
                  localThresholds.postmeal_glucose_critical
                ),
                systolic_warning: String(localThresholds.systolic_warning),
                systolic_critical: String(localThresholds.systolic_critical),
                diastolic_warning: String(localThresholds.diastolic_warning),
                diastolic_critical: String(localThresholds.diastolic_critical),
              })
              setThresholdOpen(true)
            }}
          >
            Set thresholds
          </Button>
        </div>

        <TabsContent value="glucose">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Glucose over time</CardTitle>
            </CardHeader>
            <CardContent>
              <GlucoseChart
                readings={allReadings}
                thresholdOverrides={localThresholds}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bp">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Blood pressure over time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BPChart
                readings={allReadings}
                thresholdOverrides={localThresholds}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          Reading history
        </h2>

        {allReadings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No readings logged yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiReadings.map((r) => {
                const d = new Date(r.timestamp)
                const valueStr =
                  r.type === "blood_pressure"
                    ? `${r.value1}/${r.value2 ?? "?"}`
                    : `${r.value1}`
                const unitStr = r.type === "blood_pressure" ? "mmHg" : "mmol/L"
                const severity =
                  r.severity === "normal"
                    ? undefined
                    : (r.severity as AlertSeverity)

                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">
                      {toLocalDateStr(d)}
                      <br />
                      <span className="text-muted-foreground">
                        {toLocalTimeStr(d)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs capitalize">
                      {r.type === "blood_pressure"
                        ? "Blood pressure"
                        : "Glucose"}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {valueStr}{" "}
                      <span className="text-muted-foreground">{unitStr}</span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {readingContext(r)}
                    </TableCell>
                    <TableCell>
                      <ReadingBadge severity={severity} />
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                      {r.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          setNoteTarget(r)
                          setNoteText(r.notes ?? "")
                          setNoteOpen(true)
                        }}
                      >
                        {r.notes ? "Edit note" : "Add note"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Log reading dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log reading for {patientName}</DialogTitle>
          </DialogHeader>
          <ReadingForm
            onSubmit={async (body) => {
              await logMutation.mutateAsync(body)
            }}
            isPending={logMutation.isPending}
            onSuccess={() => setLogOpen(false)}
            onCancel={() => setLogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Set thresholds dialog */}
      <Dialog open={thresholdOpen} onOpenChange={setThresholdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alert thresholds — {patientName}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {(
              [
                ["Fasting glucose warn (mmol/L)", "fasting_glucose_warning"],
                ["Fasting glucose crit (mmol/L)", "fasting_glucose_critical"],
                ["Post-meal warn (mmol/L)", "postmeal_glucose_warning"],
                ["Post-meal crit (mmol/L)", "postmeal_glucose_critical"],
                ["Systolic warn (mmHg)", "systolic_warning"],
                ["Systolic crit (mmHg)", "systolic_critical"],
                ["Diastolic warn (mmHg)", "diastolic_warning"],
                ["Diastolic crit (mmHg)", "diastolic_critical"],
              ] as [string, keyof typeof thresholdForm][]
            ).map(([label, key]) => (
              <div key={key} className="flex flex-col gap-1">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type="number"
                  step="0.1"
                  value={thresholdForm[key]}
                  onChange={(e) =>
                    setThresholdForm((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          {thresholdMutation.isError && (
            <p className="mt-2 text-sm text-destructive">
              Failed to save thresholds. Please try again.
            </p>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setThresholdOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveThresholds}
              disabled={thresholdMutation.isPending}
            >
              {thresholdMutation.isPending ? "Saving…" : "Save thresholds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / edit note dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {noteTarget?.notes ? "Edit note" : "Add note"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="note-text">Note</Label>
            <Textarea
              id="note-text"
              rows={4}
              placeholder="Clinical note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
          </div>
          {noteMutation.isError && (
            <p className="text-sm text-destructive">
              Failed to save note. Please try again.
            </p>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNoteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNote}
              disabled={noteMutation.isPending}
            >
              {noteMutation.isPending ? "Saving…" : "Save note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
