import { createFileRoute } from "@tanstack/react-router"
import { DailyReadingWorksheet } from "@/components/readings/DailyReadingWorksheet"

export const Route = createFileRoute("/patient/log")({
  component: PatientLogPage,
})

function PatientLogPage() {
  return <DailyReadingWorksheet />
}
