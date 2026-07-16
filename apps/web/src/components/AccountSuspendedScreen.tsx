import { RiErrorWarningLine } from "@remixicon/react"

export function AccountSuspendedScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background px-6 pt-[12vh] pb-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-28 items-center justify-center rounded-full">
          <img src="/logo.png" alt="Maeterna" className="rounded-full" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
      </div>

      <div className="flex w-full max-w-sm items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <RiErrorWarningLine className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium text-foreground">
            Your account has been suspended.
          </p>
          <p className="text-sm text-muted-foreground">Contact support.</p>
        </div>
      </div>
    </div>
  )
}
