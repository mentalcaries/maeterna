import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/card"
import { RiUserHeartLine, RiStethoscopeLine } from "@remixicon/react"
import { cn } from "@/lib/utils"
import { authClient, getAppUser } from "@/lib/auth-client"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/signup/select-role")({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    const user = getAppUser(session)

    if (!user) throw redirect({ to: "/login" })

    if (user.role === "patient") {
      throw redirect({
        to: user.firstName ? "/patient/dashboard" : "/signup/patient",
      })
    }
    if (user.role === "doctor") {
      throw redirect({
        to: user.firstName ? "/doctor/dashboard" : "/signup/doctor",
      })
    }
    if (user.role === "admin") throw redirect({ to: "/admin/dashboard" })
  },
  component: SelectRolePage,
})

function SelectRolePage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<"patient" | "doctor" | null>(null)

  const roleMutation = useMutation({
    mutationFn: (role: "patient" | "doctor") =>
      apiClient.PATCH("/profile/role", { body: { role } }),
    onSuccess: (_, role) => {
      if (role === "patient") void navigate({ to: "/signup/patient" })
      else void navigate({ to: "/signup/doctor" })
    },
  })

  function handleSelect(role: "patient" | "doctor") {
    setSelected(role)
    roleMutation.mutate(role)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background px-6 pt-[12vh] pb-12">
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
          <CardDescription className="text-base">
            Which best describes you?
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <RoleCard
            role="patient"
            icon={RiUserHeartLine}
            title="I'm a patient"
            description="Track your health during and after pregnancy"
            disabled={roleMutation.isPending}
            loading={roleMutation.isPending && selected === "patient"}
            onSelect={handleSelect}
          />
          <RoleCard
            role="doctor"
            icon={RiStethoscopeLine}
            title="I'm a doctor"
            description="Monitor your patients' maternal health data"
            disabled={roleMutation.isPending}
            loading={roleMutation.isPending && selected === "doctor"}
            onSelect={handleSelect}
          />

          {roleMutation.isError && (
            <p className="text-center text-base text-destructive">
              Something went wrong. Please try again.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RoleCard({
  role,
  icon: Icon,
  title,
  description,
  disabled,
  loading,
  onSelect,
}: {
  role: "patient" | "doctor"
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  disabled: boolean
  loading: boolean
  onSelect: (role: "patient" | "doctor") => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(role)}
      className={cn(
        "flex items-start gap-4 rounded-lg border-2 border-border p-4 text-left transition-all",
        "hover:border-primary/50 hover:bg-primary/5",
        "disabled:pointer-events-none disabled:opacity-60",
        loading && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="size-5 text-primary" />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-base font-semibold">{title}</p>
        <p className="text-base text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}
