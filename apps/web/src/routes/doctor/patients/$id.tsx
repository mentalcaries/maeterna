import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect } from "react"
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
import { Separator } from "@/components/separator"
import { apiClient } from "@/lib/api-client"
import type { components } from "@/lib/api.types"
import { ReadingForm } from "@/components/readings/ReadingForm"
import type { ReadingBody } from "@/components/readings/ReadingForm"
import { GlucoseChart } from "@/components/charts/GlucoseChart"
import { BPChart } from "@/components/charts/BPChart"
import { GlucoseHistoryTable } from "@/components/readings/GlucoseHistoryTable"
import { BPHistoryTable } from "@/components/readings/BPHistoryTable"
import {
  RiArrowLeftLine,
  RiDownloadLine,
  RiAddLine,
  RiFileExcel2Line,
  RiFilePdfLine,
} from "@remixicon/react"
import { DEFAULT_THRESHOLDS } from "@/lib/thresholds"
import type { Thresholds } from "@/lib/thresholds"
import { mgdlToMmol, mmolToMgdl } from "@/lib/glucose"
import { cn } from "@/lib/utils"
import { adaptReading } from "@/lib/readings"
import { type TimeRange, RANGE_LABELS, rangeToFrom } from "@/lib/time-range"
import {
  toLocalDateStr,
  toLocalTimeStr,
  type ApiReading,
} from "@/lib/reading-history"

export const Route = createFileRoute("/doctor/patients/$id")({
  component: PatientDetailPage,
})

type ApiThresholds = components["schemas"]["Thresholds"]

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
  fasted: "Fasted",
  post_meal: "After eating",
  morning: "Morning",
  evening: "Evening",
}

type GlucoseContextFilter = "all" | "fasted" | "post_meal"
const GLUCOSE_CONTEXT_FILTER_LABELS: Record<GlucoseContextFilter, string> = {
  all: "All",
  fasted: "Fasted",
  post_meal: "Post-meal",
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
  const [displayUnit, setDisplayUnit] = useState<"mg/dL" | "mmol/L">("mg/dL")
  const [range, setRange] = useState<TimeRange>("month")
  const [activeTab, setActiveTab] = useState<"glucose" | "bp">("glucose")
  const [glucoseContextFilter, setGlucoseContextFilter] =
    useState<GlucoseContextFilter>("all")
  const [highlightedReadingId, setHighlightedReadingId] = useState<
    string | null
  >(null)

  const { data: prefsData } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiClient.GET("/preferences"),
  })

  useEffect(() => {
    if (prefsData?.data?.glucoseUnit) {
      setDisplayUnit(prefsData.data.glucoseUnit as "mg/dL" | "mmol/L")
    }
  }, [prefsData])

  const { data: patientDetail, isPending } = useQuery({
    queryKey: ["patient", patientId, range],
    queryFn: async () => {
      const res = await apiClient.GET("/doctors/me/patients/{patientId}", {
        params: { path: { patientId }, query: { from: rangeToFrom(range) } },
      })
      return res.data ?? null
    },
  })

  const patient = patientDetail?.patient
  const apiReadings = patientDetail?.readings ?? []
  const localThresholds: Thresholds =
    patientDetail?.thresholds ?? DEFAULT_THRESHOLDS
  const isCustomThresholds = (
    Object.keys(DEFAULT_THRESHOLDS) as (keyof Thresholds)[]
  ).some((key) => localThresholds[key] !== DEFAULT_THRESHOLDS[key])

  const [thresholdForm, setThresholdForm] = useState<
    Record<keyof Thresholds, string>
  >(() => ({
    fastingGlucoseHigh: String(localThresholds.fastingGlucoseHigh),
    postMealGlucoseHigh: String(localThresholds.postMealGlucoseHigh),
    systolicHigh: String(localThresholds.systolicHigh),
    diastolicHigh: String(localThresholds.diastolicHigh),
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
  const alerts = allReadings.filter((r) => r.severity === "high")
  const patientName = `${patient.firstName} ${patient.lastName}`

  function openNoteDialog(r: ApiReading) {
    setNoteTarget(r)
    setNoteText(r.notes ?? "")
    setNoteOpen(true)
  }

  function handleSaveNote() {
    if (!noteTarget || !noteText.trim()) return
    noteMutation.mutate({ readingId: noteTarget.id, notes: noteText.trim() })
  }

  function handleSaveThresholds() {
    const toMgdl = (v: number) => (displayUnit === "mmol/L" ? mmolToMgdl(v) : v)
    thresholdMutation.mutate({
      fastingGlucoseHigh: toMgdl(parseFloat(thresholdForm.fastingGlucoseHigh)),
      postMealGlucoseHigh: toMgdl(
        parseFloat(thresholdForm.postMealGlucoseHigh)
      ),
      systolicHigh: parseFloat(thresholdForm.systolicHigh),
      diastolicHigh: parseFloat(thresholdForm.diastolicHigh),
    })
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
        Unit: r.type === "blood_pressure" ? "mmHg" : displayUnit,
        Context: readingContext(r),
        Notes: r.notes ?? "",
        Status: r.severity === "high" ? "High" : "Normal",
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
        r.type === "blood_pressure" ? "mmHg" : displayUnit,
        readingContext(r),
        r.notes ?? "",
        r.severity === "high" ? "High" : "Normal",
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
              <div className="absolute top-full right-0 z-10 mt-1 min-w-40 rounded-lg border border-border bg-background p-1 shadow-md">
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{patientName}</h1>
            {patient.status === "suspended" && (
              <Badge variant="destructive">Suspended</Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const fromMgdl = (v: number) =>
                displayUnit === "mmol/L" ? mgdlToMmol(v) : v
              setThresholdForm({
                fastingGlucoseHigh: String(
                  fromMgdl(localThresholds.fastingGlucoseHigh)
                ),
                postMealGlucoseHigh: String(
                  fromMgdl(localThresholds.postMealGlucoseHigh)
                ),
                systolicHigh: String(localThresholds.systolicHigh),
                diastolicHigh: String(localThresholds.diastolicHigh),
              })
              setThresholdOpen(true)
            }}
          >
            Set thresholds
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{patient.email}</p>
        {alerts.length > 0 && (
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="critical">
              {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
            </Badge>
            <span className="text-xs text-muted-foreground">
              in reading history
            </span>
          </div>
        )}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "glucose" | "bp")}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="h-auto gap-0.5 rounded-md border border-border bg-transparent p-0.5">
              <TabsTrigger
                value="glucose"
                className="rounded px-2.5 py-1 text-xs font-medium transition-colors data-active:bg-primary data-active:text-primary-foreground data-active:shadow-none"
              >
                Glucose
              </TabsTrigger>
              <TabsTrigger
                value="bp"
                className="rounded px-2.5 py-1 text-xs font-medium transition-colors data-active:bg-primary data-active:text-primary-foreground data-active:shadow-none"
              >
                Blood Pressure
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
              {(Object.keys(RANGE_LABELS) as TimeRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    range === r
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "glucose" && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                {(["mg/dL", "mmol/L"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setDisplayUnit(u)}
                    className={cn(
                      "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                      displayUnit === u
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                {(
                  Object.keys(
                    GLUCOSE_CONTEXT_FILTER_LABELS
                  ) as GlucoseContextFilter[]
                ).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setGlucoseContextFilter(f)}
                    className={cn(
                      "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                      glucoseContextFilter === f
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {GLUCOSE_CONTEXT_FILTER_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
          )}
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
                displayUnit={displayUnit}
                highlightedReadingId={highlightedReadingId}
                contextFilter={glucoseContextFilter}
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
                highlightedReadingId={highlightedReadingId}
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

        {activeTab === "glucose" ? (
          <GlucoseHistoryTable
            readings={apiReadings.filter((r) => r.type === "glucose")}
            displayUnit={displayUnit}
            onEditNote={openNoteDialog}
            onHoverReading={setHighlightedReadingId}
          />
        ) : (
          <BPHistoryTable
            readings={apiReadings.filter((r) => r.type === "blood_pressure")}
            onEditNote={openNoteDialog}
            onHoverReading={setHighlightedReadingId}
          />
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
          <p className="text-xs text-muted-foreground">
            {isCustomThresholds
              ? "Showing this patient's custom thresholds."
              : "Showing platform default thresholds."}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {(
              [
                [`Fasting glucose high (${displayUnit})`, "fastingGlucoseHigh"],
                [
                  `Post-meal glucose high (${displayUnit})`,
                  "postMealGlucoseHigh",
                ],
                ["Systolic high (mmHg)", "systolicHigh"],
                ["Diastolic high (mmHg)", "diastolicHigh"],
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
