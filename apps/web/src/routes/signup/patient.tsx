import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/button"
import { Input } from "@/components/input"
import { Label } from "@/components/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/card"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/popover"
import { Calendar } from "@/components/calendar"
import { RiCalendarLine } from "@remixicon/react"
import { authClient, getAppUser } from "@/lib/auth-client"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/signup/patient")({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    const user = getAppUser(session)

    if (!user) throw redirect({ to: "/login" })
    if (!user.role) throw redirect({ to: "/signup/select-role" })
    if (user.role !== "patient") throw redirect({ to: "/" })
    if (user.firstName) throw redirect({ to: "/patient/dashboard" })
  },
  component: PatientProfilePage,
})

function PatientProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dob, setDob] = useState<Date | undefined>(undefined)
  const [dobOpen, setDobOpen] = useState(false)
  const [profileError, setProfileError] = useState("")

  const profileMutation = useMutation({
    mutationFn: (body: {
      firstName: string
      lastName: string
      dateOfBirth?: string
    }) => apiClient.POST("/profile/complete", { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["session"] })
      void navigate({ to: "/patient/dashboard" })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileError("")
    if (!firstName.trim()) {
      setProfileError("First name is required.")
      return
    }
    if (!lastName.trim()) {
      setProfileError("Last name is required.")
      return
    }
    if (!dob) {
      setProfileError("Date of birth is required.")
      return
    }
    profileMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: dob.toISOString().split("T")[0],
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background px-6 pt-[12vh] pb-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-28 items-center justify-center rounded-full">
          <img src="/logo.png" alt="Maeterna" className="rounded-full" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        <p className="text-sm text-muted-foreground">Almost there</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription className="text-base">
            Complete your profile to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Date of birth</Label>
              <Popover open={dobOpen} onOpenChange={setDobOpen}>
                <PopoverTrigger
                  type="button"
                  className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-normal hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <RiCalendarLine className="size-4 shrink-0 text-muted-foreground" />
                  {dob ? (
                    dob.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  ) : (
                    <span className="text-muted-foreground">
                      Select date of birth
                    </span>
                  )}
                </PopoverTrigger>
                <PopoverContent>
                  <Calendar
                    mode="single"
                    selected={dob}
                    onSelect={(d) => {
                      setDob(d)
                      setDobOpen(false)
                    }}
                    captionLayout="dropdown"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
                    defaultMonth={
                      dob ?? new Date(new Date().getFullYear() - 25, 0)
                    }
                    disabled={{ after: new Date() }}
                    classNames={{ caption_label: "hidden" }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {(profileError || profileMutation.isError) && (
              <p className="text-sm text-destructive">
                {profileError || "Failed to save profile. Please try again."}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={profileMutation.isPending}
            >
              {profileMutation.isPending ? "Saving…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
