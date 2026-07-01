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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/dialog"
import { authClient, getAppUser } from "@/lib/auth-client"
import { apiClient } from "@/lib/api-client"

export const Route = createFileRoute("/signup/doctor/")({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    const user = getAppUser(session)

    if (!user) throw redirect({ to: "/login" })
    if (!user.role) throw redirect({ to: "/signup/select-role" })
    if (user.role !== "doctor") throw redirect({ to: "/" })
    if (user.firstName) {
      throw redirect({
        to:
          user.status === "pending_verification"
            ? "/signup/doctor/pending"
            : "/doctor/dashboard",
      })
    }
  },
  component: DoctorProfilePage,
})

function DoctorProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [profileError, setProfileError] = useState("")
  const [verificationFailed, setVerificationFailed] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)

  const profileMutation = useMutation({
    mutationFn: (body: { firstName: string; lastName: string }) =>
      apiClient.POST("/profile/complete", { body }),
    onSuccess: (res) => {
      const data = res.data
      if (!data) return
      if ("verificationFailed" in data && data.verificationFailed) {
        setVerificationFailed(true)
        return
      }
      void queryClient.invalidateQueries({ queryKey: ["session"] })
      if ("status" in data && data.status === "pending_verification") {
        void navigate({ to: "/signup/doctor/pending" })
      } else {
        void navigate({ to: "/signup/doctor/affiliations" })
      }
    },
  })

  const submitForReviewMutation = useMutation({
    mutationFn: (body: { firstName: string; lastName: string }) =>
      apiClient.POST("/profile/complete/submit-for-review", { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["session"] })
      void navigate({ to: "/signup/doctor/pending" })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProfileError("")
    setVerificationFailed(false)
    if (!firstName.trim()) {
      setProfileError("First name is required.")
      return
    }
    if (!lastName.trim()) {
      setProfileError("Last name is required.")
      return
    }
    profileMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background px-6 pt-[12vh] pb-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-28 items-center justify-center rounded-full">
          <img src="/logo.png" alt="Maeterna" className="rounded-full" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Maeterna</h1>
        <p className="text-sm text-muted-foreground">
          Step 1 of 2 — Profile &amp; verification
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Profile &amp; registration</CardTitle>
          <CardDescription className="text-base">
            Enter your name as listed on the MBTT national registry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label
                  htmlFor="firstName"
                  className="text-base font-medium tracking-normal normal-case"
                >
                  First name
                </Label>
                <Input
                  id="firstName"
                  className="text-base"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label
                  htmlFor="lastName"
                  className="text-base font-medium tracking-normal normal-case"
                >
                  Last name
                </Label>
                <Input
                  id="lastName"
                  className="text-base"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>

            {(profileError || profileMutation.isError) && (
              <p className="text-sm text-destructive">
                {profileError || "Something went wrong. Please try again."}
              </p>
            )}

            {verificationFailed && (
              <div className="flex flex-col gap-2">
                <p className="my-3 text-sm text-destructive">
                  We couldn't verify your name against the MBTT registry. Please
                  check that your name matches your registration exactly and try
                  again.
                </p>
                <Button
                  variant="outline"
                  type="button"
                  className="mx-auto self-start text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setReviewDialogOpen(true)}
                >
                  request manual approval.
                </Button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={profileMutation.isPending}
            >
              {profileMutation.isPending ? "Verifying…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for manual review?</DialogTitle>
          </DialogHeader>
          <p className="text-base text-muted-foreground">
            Your account will be reviewed by the Maeterna team. This typically
            takes 1–3 business days. You won't be able to access the platform
            until approved.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialogOpen(false)}
              disabled={submitForReviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                submitForReviewMutation.mutate({
                  firstName: firstName.trim(),
                  lastName: lastName.trim(),
                })
              }}
              disabled={submitForReviewMutation.isPending}
            >
              {submitForReviewMutation.isPending ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
