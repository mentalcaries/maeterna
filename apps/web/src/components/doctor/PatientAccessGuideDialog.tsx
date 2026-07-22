import { useEffect, useRef, useState } from "react"
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckLine,
  RiCloseLine,
  RiHome5Line,
  RiSearchLine,
  RiSettings3Line,
  RiShieldLine,
  RiUserLine,
} from "@remixicon/react"
import { Button } from "@/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog"
import { Input } from "@/components/input"
import { getAppUser } from "@/lib/auth-client"
import { useSession } from "@/lib/session"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    eyebrow: "Open Access",
    instruction: "Ask the patient to tap Access.",
    detail: "It is in the patient navigation at the bottom of their screen.",
  },
  {
    eyebrow: "Find Your Profile",
    instruction: "Ask the patient to search your name and select your profile.",
    detail:
      "They should verify the registration details shown on their device before continuing.",
  },
  {
    eyebrow: "Confirm Access",
    instruction:
      "Ask the patient to choose the access scope and tap Grant access.",
    detail:
      "They remain in control and can revoke this access from the same screen.",
  },
] as const

type PatientAccessGuideDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PatientAccessGuideDialog({
  open,
  onOpenChange,
}: PatientAccessGuideDialogProps) {
  const { data: sessionData } = useSession()
  const user = getAppUser(sessionData)
  const doctorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your name"
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<"forward" | "back">("forward")
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setStep(0)
      setDirection("forward")
    }
  }, [open])

  useEffect(() => {
    if (open) scrollAreaRef.current?.scrollTo({ top: 0 })
  }, [open, step])

  function goBack() {
    setDirection("back")
    setStep((current) => Math.max(0, current - 1))
  }

  function goForward() {
    if (step === STEPS.length - 1) {
      onOpenChange(false)
      return
    }

    setDirection("forward")
    setStep((current) => Math.min(STEPS.length - 1, current + 1))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100svh-1rem)] w-[calc(100%-1rem)] max-w-3xl flex-col overflow-hidden p-0 sm:max-h-[calc(100svh-2rem)] sm:w-full">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-4 sm:gap-4 sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg sm:text-xl">
              <span className="sm:hidden">Patient access guide</span>
              <span className="hidden sm:inline">
                Guide a patient to grant access
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only sm:not-sr-only">
              Follow these steps together. The patient stays in control of who
              can view their health data.
            </DialogDescription>
          </DialogHeader>
          <Button
            variant="ghost"
            size="icon"
            className="-mt-1 -mr-1 shrink-0 sm:-mt-2 sm:-mr-2"
            aria-label="Close access guide"
            onClick={() => onOpenChange(false)}
          >
            <RiCloseLine className="size-5" />
          </Button>
        </div>

        <div
          ref={scrollAreaRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <section className="flex flex-col p-4 sm:p-6">
              <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                Step {step + 1} of {STEPS.length}
              </p>
              <div
                className="mt-2 grid grid-cols-3 gap-2 sm:mt-3"
                aria-label={`Step ${step + 1} of ${STEPS.length}`}
              >
                {STEPS.map((item, index) => (
                  <div
                    key={item.eyebrow}
                    className={cn(
                      "h-1.5 rounded-full transition-colors duration-300",
                      index <= step ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>

              <div
                key={`copy-${step}-${direction}`}
                className={cn(
                  "mt-4 animate-in duration-300 fade-in motion-reduce:animate-none sm:mt-8",
                  direction === "forward"
                    ? "slide-in-from-right-2"
                    : "slide-in-from-left-2"
                )}
              >
                <p className="text-sm font-semibold text-primary">
                  {STEPS[step].eyebrow}
                </p>
                <h2 className="mt-1.5 text-lg leading-snug font-semibold sm:mt-2 sm:text-xl">
                  {STEPS[step].instruction}
                </h2>
                <p className="sr-only text-sm leading-relaxed text-muted-foreground sm:not-sr-only sm:mt-3">
                  {STEPS[step].detail}
                </p>
              </div>

              {step === STEPS.length - 1 && (
                <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-sm sm:mt-6 sm:items-start sm:gap-3 sm:p-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <RiCheckLine className="size-4" />
                  </span>
                  <p className="sm:hidden">
                    Refresh your patient list after access is granted.
                  </p>
                  <p className="hidden sm:block">
                    After the patient confirms, close this guide and refresh
                    your patient list.
                  </p>
                </div>
              )}
            </section>

            <div className="flex items-center justify-center border-t border-border bg-muted/30 p-3 sm:p-4 md:min-h-96 md:border-t-0 md:border-l md:p-6">
              <div
                key={`preview-${step}-${direction}`}
                className={cn(
                  "w-full max-w-sm animate-in duration-300 fade-in motion-reduce:animate-none",
                  direction === "forward"
                    ? "slide-in-from-right-3"
                    : "slide-in-from-left-3"
                )}
              >
                <PatientPhonePreview step={step} doctorName={doctorName} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background p-3 sm:p-4 sm:px-6">
          <Button
            variant="outline"
            size="sm"
            onClick={goBack}
            disabled={step === 0}
          >
            <RiArrowLeftLine className="size-4" />
            Back
          </Button>
          <Button size="sm" onClick={goForward}>
            {step === STEPS.length - 1 ? "Finish" : "Next"}
            {step < STEPS.length - 1 && <RiArrowRightLine className="size-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PatientPhonePreview({
  step,
  doctorName,
}: {
  step: number
  doctorName: string
}) {
  return (
    <div
      className="overflow-hidden rounded-[1.5rem] border-4 border-foreground/85 bg-background shadow-lg sm:rounded-[1.75rem] sm:border-[6px]"
      aria-hidden="true"
    >
      <div className="mx-auto mt-1.5 h-1.5 w-12 rounded-full bg-foreground/20 sm:mt-2 sm:w-14" />

      {step === 0 && <OpenAccessPreview />}
      {step === 1 && <FindDoctorPreview doctorName={doctorName} />}
      {step === 2 && <GrantAccessPreview doctorName={doctorName} />}
    </div>
  )
}

function PreviewHeader() {
  return (
    <div className="flex h-10 items-center gap-2 border-b border-border px-3 sm:h-12 sm:px-4">
      <img src="/logo.png" alt="" className="size-6 rounded-full sm:size-7" />
      <span className="text-sm font-semibold tracking-wide">Maeterna</span>
    </div>
  )
}

function OpenAccessPreview() {
  return (
    <div className="flex min-h-64 flex-col sm:min-h-80">
      <PreviewHeader />
      <div className="flex flex-1 flex-col justify-between">
        <div className="space-y-2.5 p-3 sm:space-y-3 sm:p-4">
          <div className="h-4 w-28 rounded bg-muted sm:h-5 sm:w-32" />
          <div className="h-14 rounded-lg border border-border bg-card sm:h-20" />
          <div className="h-14 rounded-lg border border-border bg-card sm:h-20" />
        </div>
        <div className="grid grid-cols-3 border-t border-border bg-background p-1.5 sm:p-2">
          <PreviewNavItem icon={RiHome5Line} label="Home" />
          <PreviewNavItem icon={RiShieldLine} label="Access" active />
          <PreviewNavItem icon={RiSettings3Line} label="Settings" />
        </div>
      </div>
    </div>
  )
}

function PreviewNavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] sm:py-2",
        active
          ? "bg-primary/10 font-semibold text-primary"
          : "text-muted-foreground"
      )}
    >
      {active && (
        <span className="absolute inset-0 animate-pulse rounded-lg ring-2 ring-primary/30 motion-reduce:animate-none" />
      )}
      <Icon className="size-4 sm:size-5" />
      <span>{label}</span>
    </div>
  )
}

function FindDoctorPreview({ doctorName }: { doctorName: string }) {
  return (
    <div className="min-h-64 sm:min-h-80">
      <PreviewHeader />
      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        <div>
          <p className="text-base font-semibold sm:text-lg">Manage Access</p>
          <p className="text-[11px] text-muted-foreground">
            Control which doctors can view your health data.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold">Grant access</p>
          <div className="relative">
            <RiSearchLine className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={doctorName}
              readOnly
              tabIndex={-1}
              className="h-8 pl-8 text-xs sm:h-9"
            />
          </div>
          <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-2.5 ring-2 ring-primary/10 sm:p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{doctorName}</p>
              <p className="text-[10px] text-muted-foreground">
                Verify registration details
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-semibold text-primary">
              Grant
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function GrantAccessPreview({ doctorName }: { doctorName: string }) {
  return (
    <div className="min-h-64 bg-foreground/5 p-2 sm:min-h-80 sm:p-3">
      <div className="rounded-xl border border-border bg-background p-3 shadow-md sm:p-4">
        <p className="text-base font-semibold">Grant access</p>
        <div className="mt-2 sm:mt-3">
          <p className="truncate text-sm font-medium">{doctorName}</p>
          <p className="text-[10px] text-muted-foreground">
            Confirm the profile details on screen
          </p>
        </div>
        <div className="my-2 border-t border-border sm:my-3" />
        <p className="text-xs text-muted-foreground">
          Choose the scope of access.
        </p>
        <div className="mt-2 flex items-start gap-2 rounded-lg border-2 border-primary bg-primary/5 p-2 sm:gap-3 sm:p-3">
          <RiUserLine className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-primary">
              {doctorName}
            </p>
            <p className="text-[10px] text-muted-foreground">
              This doctor only
            </p>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          A department option may also appear for affiliated doctors.
        </p>
        <div className="mt-3 flex justify-end gap-2 sm:mt-4">
          <span className="rounded-md border border-border px-2.5 py-1.5 text-[10px] font-semibold uppercase sm:px-3 sm:py-2">
            Cancel
          </span>
          <span className="animate-pulse rounded-md bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-primary-foreground uppercase ring-4 ring-primary/15 motion-reduce:animate-none sm:px-3 sm:py-2">
            Grant access
          </span>
        </div>
      </div>
    </div>
  )
}
