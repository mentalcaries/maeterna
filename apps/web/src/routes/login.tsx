import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
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
import { RiGoogleLine, RiMailLine, RiFingerprint2Line } from "@remixicon/react"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

type Mode = "options" | "magic-link-sent"

function AppHeader() {
  return (
    <div className="mb-8 flex flex-col items-center gap-2 text-center">
      <div className="flex size-28 items-center justify-center rounded-full">
        <img
          src="/logo.png"
          alt="Silhouette of a pregnant patient"
          className="rounded-full"
        />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
      <p className="text-sm text-muted-foreground">
        Maternal Health Monitoring
      </p>
    </div>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>("options")
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<
    "google" | "magic" | "passkey" | null
  >(null)

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
    setIsLoading(true)
    setLoadingAction("magic")
    try {
      await authClient.signIn.magicLink({
        email: email.trim(),
        callbackURL: `${import.meta.env.VITE_APP_URL}/auth/callback`,
      })
      setMode("magic-link-sent")
    } catch {
      setEmailError("Failed to send magic link. Please try again.")
    } finally {
      setIsLoading(false)
      setLoadingAction(null)
    }
  }

  async function handlePasskey() {
    setLoadingAction("passkey")
    try {
      // @ts-expect-error passkey plugin may not be in type definitions
      await authClient.signIn.passkey()
      void navigate({ to: "/" })
    } catch {
      // passkey not configured or failed — do nothing
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background px-6 pt-[12vh] pb-12">
      <AppHeader />

      {mode === "magic-link-sent" ? (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription className="text-base">
              We sent a sign-in link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-base text-muted-foreground">
              Click the link in the email to sign in. The link expires in 10
              minutes.
            </p>
            <button
              type="button"
              className="mt-4 text-base text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={() => {
                setMode("options")
                setEmail("")
              }}
            >
              Use a different email
            </button>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription className="text-base">
              Choose how you'd like to sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              className="w-full gap-2"
              onClick={() => void handleGoogle()}
              disabled={loadingAction !== null}
            >
              <RiGoogleLine className="size-4" />
              {loadingAction === "google"
                ? "Redirecting…"
                : "Continue with Google"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs text-muted-foreground">
                <span className="bg-card px-2">or</span>
              </div>
            </div>

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
                  disabled={isLoading}
                  autoComplete="email"
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={loadingAction !== null}
              >
                <RiMailLine className="size-4" />
                {loadingAction === "magic" ? "Sending…" : "Send magic link"}
              </Button>
            </form>

            <Button
              variant="outline"
              className="w-full gap-2 text-muted-foreground"
              onClick={() => void handlePasskey()}
              disabled={loadingAction !== null}
            >
              <RiFingerprint2Line className="size-4" />
              {loadingAction === "passkey" ? "Verifying…" : "Use passkey"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
