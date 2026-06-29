import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@workspace/ui/components/popover"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  RiGoogleLine,
  RiMailLine,
  RiFingerprint2Line,
  RiCalendarLine,
} from "@remixicon/react"
import { authClient, getAppUser } from "@/lib/auth-client"
import { useSession } from "@/lib/session"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/signup/patient")({
  component: PatientSignupPage,
})

type Mode = "auth" | "magic-sent" | "profile"

function PatientSignupPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: sessionData, isPending: sessionLoading } = useSession()
  const user = getAppUser(sessionData)

  const [mode, setMode] = useState<Mode>("auth")
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [loadingAction, setLoadingAction] = useState<
    "google" | "magic" | "passkey" | null
  >(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dob, setDob] = useState<Date | undefined>(undefined)
  const [profileError, setProfileError] = useState("")

  useEffect(() => {
    if (sessionLoading) return
    if (!user) return
    if (user.firstName) {
      void navigate({ to: "/patient/dashboard" })
      return
    }
    setMode("profile")
  }, [user, sessionLoading, navigate])

  const profileMutation = useMutation({
    mutationFn: (body: {
      firstName: string
      lastName: string
      dateOfBirth?: string
    }) => apiClient.PATCH("/patients/me", { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["session"] })
      void navigate({ to: "/patient/dashboard" })
    },
  })

  async function handleGoogle() {
    setLoadingAction("google")
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${import.meta.env.VITE_APP_URL}/auth/callback`,
    })
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setEmailError("")
    if (!email.trim()) {
      setEmailError("Please enter your email address.")
      return
    }
    setLoadingAction("magic")
    try {
      await authClient.signIn.magicLink({
        email: email.trim(),
        callbackURL: `${import.meta.env.VITE_APP_URL}/auth/callback`,
      })
      setMode("magic-sent")
    } catch {
      setEmailError("Failed to send magic link. Please try again.")
    } finally {
      setLoadingAction(null)
    }
  }

  async function handlePasskey() {
    setLoadingAction("passkey")
    try {
      // @ts-expect-error passkey plugin may not be in type definitions
      await authClient.signIn.passkey()
      void navigate({ to: "/signup/patient" })
    } catch {
      // passkey not configured or failed — do nothing
    } finally {
      setLoadingAction(null)
    }
  }

  function handleProfileSubmit(e: React.FormEvent) {
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

  if (sessionLoading) return null

  if (mode === "magic-sent") {
    return (
      <PageShell>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent a sign-in link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Click the link in your email to continue signing up. The link
              expires in 5 minutes.
            </p>
            <button
              type="button"
              className="mt-4 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={() => {
                setMode("auth")
                setEmail("")
              }}
            >
              Use a different email
            </button>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  if (mode === "profile") {
    return (
      <PageShell subtitle="Almost there">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Your details</CardTitle>
            <CardDescription>
              Complete your profile to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleProfileSubmit}
              className="flex flex-col gap-4"
            >
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
                <Popover>
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
                      onSelect={setDob}
                      disabled={{ after: new Date() }}
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
      </PageShell>
    )
  }

  return (
    <PageShell>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create a patient account</CardTitle>
          <CardDescription>Choose how you'd like to sign up.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => void handleGoogle()}
            disabled={loadingAction !== null}
          >
            <RiGoogleLine className="size-4" />
            {loadingAction === "google"
              ? "Redirecting…"
              : "Continue with Google"}
          </Button>

          <Divider />

          <form
            onSubmit={(e) => void handleMagicLink(e)}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loadingAction !== null}
                autoComplete="email"
              />
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
            </div>
            <Button
              type="submit"
              variant="outline"
              className="w-full gap-2"
              disabled={loadingAction !== null}
            >
              <RiMailLine className="size-4" />
              {loadingAction === "magic" ? "Sending…" : "Send magic link"}
            </Button>
          </form>

          <Button
            variant="ghost"
            className="w-full gap-2 text-muted-foreground"
            onClick={() => void handlePasskey()}
            disabled={loadingAction !== null}
          >
            <RiFingerprint2Line className="size-4" />
            {loadingAction === "passkey" ? "Verifying…" : "Use passkey"}
          </Button>

          <div className="pt-1 text-center">
            <a
              href="/login"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Already have an account? Sign in
            </a>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}

function PageShell({
  children,
  subtitle,
}: {
  children: React.ReactNode
  subtitle?: string
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-28 items-center justify-center rounded-full">
          <img src="/logo.png" alt="Maeterna" className="rounded-full" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Maternal Health Monitoring
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

function Divider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs text-muted-foreground">
        <span className="bg-card px-2">or</span>
      </div>
    </div>
  )
}
