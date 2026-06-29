import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/button"
import { RiHeartPulseLine, RiTimeLine } from "@remixicon/react"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/doctor/pending")({
  component: DoctorPendingPage,
})

function DoctorPendingPage() {
  const navigate = useNavigate()

  function handleSignOut() {
    void authClient.signOut().then(() => navigate({ to: "/" }))
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <RiTimeLine className="size-8 text-muted-foreground" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2">
            <RiHeartPulseLine className="size-4 text-primary" />
            <span className="text-sm font-semibold tracking-wide">
              Maeterna
            </span>
          </div>
          <h1 className="text-xl font-semibold">Pending verification</h1>
          <p className="text-sm text-muted-foreground">
            Your registration number was not found in the MBTT registry. Your
            account has been submitted for manual review.
          </p>
          <p className="text-sm text-muted-foreground">
            You will be notified once approved.
          </p>
        </div>

        <div className="w-full rounded-lg border border-border bg-muted/30 p-4 text-left text-xs text-muted-foreground">
          <p className="font-medium text-foreground">What happens next?</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>The Maeterna admin team will review your application</li>
            <li>Manual verification typically takes 1–3 business days</li>
            <li>
              You will receive an email notification once your account is
              approved
            </li>
          </ul>
        </div>

        <Button variant="outline" className="w-full" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  )
}
