import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { getSession } from "@/mock/auth"
import { ReadingForm } from "@/components/readings/ReadingForm"

export const Route = createFileRoute("/patient/log")({
  component: PatientLogPage,
})

function PatientLogPage() {
  const navigate = useNavigate()
  const session = getSession()
  const [submitted, setSubmitted] = useState(false)

  if (!session) return null

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 pt-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <span className="text-2xl">✓</span>
        </div>
        <h2 className="text-lg font-semibold">Reading logged!</h2>
        <p className="text-sm text-muted-foreground">
          Your reading has been saved.
        </p>
        <button
          className="text-sm text-primary underline underline-offset-2"
          onClick={() => setSubmitted(false)}
        >
          Log another
        </button>
        <button
          className="text-sm text-muted-foreground underline underline-offset-2"
          onClick={() => void navigate({ to: "/patient/dashboard" })}
        >
          Back to home
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1 pt-4">
        <h1 className="text-xl font-semibold">Log a reading</h1>
        <p className="text-sm text-muted-foreground">
          Record your glucose or blood pressure.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">New reading</CardTitle>
        </CardHeader>
        <CardContent>
          <ReadingForm
            patientId={session.userId}
            loggedById={session.userId}
            onSuccess={() => setSubmitted(true)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
