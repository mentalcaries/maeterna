import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Separator } from "@workspace/ui/components/separator"
import {
  patients,
  doctors,
  getPatientReadings,
  addNote,
  setPatientThresholds,
} from "@/mock/db"
import { getSession } from "@/mock/auth"
import { ReadingBadge } from "@/components/readings/ReadingBadge"
import { ReadingForm } from "@/components/readings/ReadingForm"
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
import type { Reading } from "@/mock/db"

export const Route = createFileRoute("/doctor/patients/$id")({
  component: PatientDetailPage,
})

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
const LEGACY_CONTEXT_LABELS: Record<string, string> = {
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
  if (parts.length === 0)
    parts.push(LEGACY_CONTEXT_LABELS[r.context] ?? r.context)
  return parts.join(" · ")
}

function toLocalDateStr(d: Date): string {
  return d.toLocaleDateString("en-TT", { month: "short", day: "numeric" })
}

function toLocalTimeStr(d: Date): string {
  return d.toLocaleTimeString("en-TT", { hour: "2-digit", minute: "2-digit" })
}

function PatientDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const session = getSession()

  const patient = patients.find((p) => p.id === id)
  const doctor = doctors.find((d) => d.id === session?.userId)

  const [refreshKey, setRefreshKey] = useState(0)
  const [noteTarget, setNoteTarget] = useState<Reading | null>(null)
  const [noteText, setNoteText] = useState("")
  const [noteOpen, setNoteOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [thresholdOpen, setThresholdOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const [thresholdForm, setThresholdForm] = useState({
    fasting_glucose_warning: String(
      patient?.thresholds?.fasting_glucose_warning ??
        DEFAULT_THRESHOLDS.fasting_glucose_warning
    ),
    fasting_glucose_critical: String(
      patient?.thresholds?.fasting_glucose_critical ??
        DEFAULT_THRESHOLDS.fasting_glucose_critical
    ),
    postmeal_glucose_warning: String(
      patient?.thresholds?.postmeal_glucose_warning ??
        DEFAULT_THRESHOLDS.postmeal_glucose_warning
    ),
    postmeal_glucose_critical: String(
      patient?.thresholds?.postmeal_glucose_critical ??
        DEFAULT_THRESHOLDS.postmeal_glucose_critical
    ),
    systolic_warning: String(
      patient?.thresholds?.systolic_warning ??
        DEFAULT_THRESHOLDS.systolic_warning
    ),
    systolic_critical: String(
      patient?.thresholds?.systolic_critical ??
        DEFAULT_THRESHOLDS.systolic_critical
    ),
    diastolic_warning: String(
      patient?.thresholds?.diastolic_warning ??
        DEFAULT_THRESHOLDS.diastolic_warning
    ),
    diastolic_critical: String(
      patient?.thresholds?.diastolic_critical ??
        DEFAULT_THRESHOLDS.diastolic_critical
    ),
  })

  if (!patient || !doctor) {
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

  const allReadings = getPatientReadings(id)
  const alerts = allReadings.filter((r) => r.severity !== undefined)
  const patientName = patient.name

  function handleSaveNote() {
    if (!noteTarget || !noteText.trim()) return
    addNote(noteTarget.id, noteText.trim())
    setNoteOpen(false)
    setNoteTarget(null)
    setNoteText("")
    setRefreshKey((k) => k + 1)
  }

  function handleSaveThresholds() {
    setPatientThresholds(id, {
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
    })
    setThresholdOpen(false)
    setRefreshKey((k) => k + 1)
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
          <h1 className="text-2xl font-semibold">{patient.name}</h1>
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
            onClick={() => setThresholdOpen(true)}
          >
            Set thresholds
          </Button>
        </div>

        <TabsContent value="glucose">
          <Card key={`glucose-${refreshKey}`}>
            <CardHeader>
              <CardTitle className="text-sm">Glucose over time</CardTitle>
            </CardHeader>
            <CardContent>
              <GlucoseChart
                readings={allReadings}
                thresholdOverrides={patient.thresholds}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bp">
          <Card key={`bp-${refreshKey}`}>
            <CardHeader>
              <CardTitle className="text-sm">
                Blood pressure over time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BPChart
                readings={allReadings}
                thresholdOverrides={patient.thresholds}
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
              {allReadings.map((r) => {
                const d = new Date(r.timestamp)
                const valueStr =
                  r.type === "blood_pressure"
                    ? `${r.value1}/${r.value2 ?? "?"}`
                    : `${r.value1}`
                const unitStr = r.type === "blood_pressure" ? "mmHg" : "mmol/L"

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
                      <ReadingBadge severity={r.severity} />
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
            <DialogTitle>Log reading for {patient.name}</DialogTitle>
          </DialogHeader>
          <ReadingForm
            patientId={id}
            loggedById={doctor.id}
            onSuccess={() => {
              setLogOpen(false)
              setRefreshKey((k) => k + 1)
            }}
            onCancel={() => setLogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Set thresholds dialog */}
      <Dialog open={thresholdOpen} onOpenChange={setThresholdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alert thresholds — {patient.name}</DialogTitle>
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
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setThresholdOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveThresholds}>
              Save thresholds
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
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNoteOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveNote}>
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
