import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card"
import { apiClient } from "@/lib/api-client"
import { ReadingForm } from "@/components/readings/ReadingForm"
import type { ReadingBody } from "@/components/readings/ReadingForm"

export const Route = createFileRoute("/patient/log")({
  component: PatientLogPage,
})

function PatientLogPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [submitted, setSubmitted] = useState(false)

  const logMutation = useMutation({
    mutationFn: (body: ReadingBody) =>
      apiClient.POST("/patients/me/readings", { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["readings"] })
    },
  })

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 pt-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <span className="text-2xl">✓</span>
        </div>
        <h2 className="text-xl font-semibold">Reading logged!</h2>
        <p className="text-base text-muted-foreground">
          Your reading has been saved.
        </p>
        <button
          className="text-base text-primary underline underline-offset-2"
          onClick={() => setSubmitted(false)}
        >
          Log another
        </button>
        <button
          className="text-base text-muted-foreground underline underline-offset-2"
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
        <h1 className="text-2xl font-semibold">Log a reading</h1>
        <p className="text-base text-muted-foreground">
          Record your glucose or blood pressure.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New reading</CardTitle>
        </CardHeader>
        <CardContent>
          <ReadingForm
            onSubmit={async (body) => {
              await logMutation.mutateAsync(body)
            }}
            isPending={logMutation.isPending}
            onSuccess={() => setSubmitted(true)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
