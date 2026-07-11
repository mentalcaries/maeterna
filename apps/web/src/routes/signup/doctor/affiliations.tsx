import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/card"
import { AffiliationManager } from "@/components/doctor/AffiliationManager"

export const Route = createFileRoute("/signup/doctor/affiliations")({
  component: DoctorAffiliationsPage,
})

function DoctorAffiliationsPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-28 items-center justify-center rounded-full">
          <img src="/logo.png" alt="Maeterna" className="rounded-full" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        <p className="text-base text-muted-foreground">
          Step 2 of 2 — Affiliations (optional)
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Add affiliations (optional)</CardTitle>
          <CardDescription className="text-base">
            Add where you practice. You can update these later in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AffiliationManager />

          <Button
            className="w-full"
            onClick={() => void navigate({ to: "/doctor/dashboard" })}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
