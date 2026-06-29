import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card"
import { RiUserHeartLine, RiStethoscopeLine } from "@remixicon/react"
import { cn } from "@workspace/ui/lib/utils"

export const Route = createFileRoute("/signup/")({
  component: SignupRolePage,
})

function SignupRolePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-28 items-center justify-center rounded-full">
          <img src="/logo.png" alt="Maeterna" className="rounded-full" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        <p className="text-sm text-muted-foreground">
          Maternal Health Monitoring
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Which best describes you?</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <RoleCard
            to="/signup/patient"
            icon={RiUserHeartLine}
            title="I'm a patient"
            description="Track your health during and after pregnancy"
          />
          <RoleCard
            to="/signup/doctor/"
            icon={RiStethoscopeLine}
            title="I'm a doctor"
            description="Monitor your patients' maternal health data"
          />

          <div className="pt-2 text-center">
            <Link
              to="/login"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RoleCard({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Link to={to as "/signup/patient"}>
      <div
        className={cn(
          "flex items-start gap-4 rounded-lg border-2 border-border p-4 transition-all hover:border-primary/50 hover:bg-primary/5"
        )}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  )
}
