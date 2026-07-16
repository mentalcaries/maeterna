import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
  RiCalendarLine,
} from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover"
import { Calendar } from "@/components/calendar"
import { formatDueDate, isDueDateValid, parseDueDate } from "@/lib/due-date"
import { DEFAULT_THRESHOLDS } from "@/lib/thresholds"
import type { Thresholds } from "@/lib/thresholds"
import { mgdlToMmol, mmolToMgdl } from "@/lib/glucose"
import { cn } from "@/lib/utils"
import { adaptReading } from "@/lib/readings"
import { type TimeRange, RANGE_LABELS, rangeToFrom } from "@/lib/time-range"
import type { ApiReading } from "@/lib/reading-history"
import { exportReadingsToExcel } from "@/lib/export-excel"
import { exportReadingsToPDF } from "@/lib/export-pdf"

export const Route = createFileRoute("/doctor/patients/$id")({
  component: PatientDetailPage,
})

type ApiThresholds = components["schemas"]["Thresholds"]

type GlucoseContextFilter = "all" | "fasted" | "post_meal"
const GLUCOSE_CONTEXT_FILTER_LABELS: Record<GlucoseContextFilter, string> = {
  all: "All",
  fasted: "Fasted",
  post_meal: "Post-meal",
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

  const [dueDateOpen, setDueDateOpen] = useState(false)

  const dueDateMutation = useMutation({
    mutationFn: (dueDate: string | null) =>
      apiClient.PUT("/doctors/me/patients/{patientId}/due-date", {
        params: { path: { patientId } },
        body: { dueDate },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["patient", patientId] })
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
    exportReadingsToExcel(allReadings, patientName, displayUnit)
  }

  function handleExportPDF() {
    setExportOpen(false)
    exportReadingsToPDF(allReadings, patientName, displayUnit)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void navigate({ to: "/doctor/dashboard" })}
        >
          <RiArrowLeftLine className="mr-1 size-3.5" />
          All patients
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{patientName}</h1>
            {patient.status === "suspended" && (
              <Badge variant="destructive">Suspended</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="critical">
              {alerts.length} flagged reading{alerts.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Due date:</span>
          <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
            <PopoverTrigger
              type="button"
              className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-sm font-normal hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <RiCalendarLine className="size-3.5 shrink-0 text-muted-foreground" />
              {patient.dueDate ? (
                formatDueDate(patient.dueDate)
              ) : (
                <span className="text-muted-foreground">Set due date</span>
              )}
            </PopoverTrigger>
            <PopoverContent>
              <Calendar
                mode="single"
                selected={parseDueDate(patient.dueDate)}
                onSelect={(d) => {
                  if (d) {
                    const localDate = [
                      d.getFullYear(),
                      String(d.getMonth() + 1).padStart(2, "0"),
                      String(d.getDate()).padStart(2, "0"),
                    ].join("-")
                    dueDateMutation.mutate(localDate)
                  }
                  setDueDateOpen(false)
                }}
                captionLayout="dropdown"
                fromYear={new Date().getFullYear()}
                toYear={new Date().getFullYear() + 2}
                defaultMonth={parseDueDate(patient.dueDate) ?? new Date()}
                disabled={(d) => !isDueDateValid(d)}
                classNames={{ caption_label: "hidden" }}
              />
              {patient.dueDate && (
                <div className="border-t border-border pt-2">
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      dueDateMutation.mutate(null)
                      setDueDateOpen(false)
                    }}
                  >
                    Clear due date
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          {dueDateMutation.isError && (
            <p className="text-sm text-destructive">Failed to save due date.</p>
          )}
        </div>
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
                {/*
                  The utility of this toggle is TBD. Unit wide changes can already be made in the Settings
                
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
                ))} */}
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            Reading history
          </h2>
          <Button size="sm" onClick={() => setLogOpen(true)}>
            <RiAddLine className="mr-1 size-3.5" />
            Log Today's reading
          </Button>
        </div>

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
