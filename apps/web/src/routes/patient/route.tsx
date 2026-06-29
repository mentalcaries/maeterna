import {
  createFileRoute,
  Outlet,
  useNavigate,
  Link,
  useLocation,
} from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "@/lib/session"
import { authClient, getAppUser } from "@/lib/auth-client"
import { apiClient } from "@/lib/api-client"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  RiHeartPulseLine,
  RiHistoryLine,
  RiAddLine,
  RiLogoutBoxLine,
  RiShieldLine,
  RiSettings3Line,
} from "@remixicon/react"
import { cn } from "@workspace/ui/lib/utils"

export const Route = createFileRoute("/patient")({ component: PatientLayout })

function PatientLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { data: sessionData, isPending } = useSession()

  const isLoginPage = location.pathname === "/patient/login"

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.DELETE("/patients/me"),
    onSuccess: () => {
      void authClient.signOut().then(() => {
        queryClient.removeQueries({ queryKey: ["session"] })
        void navigate({ to: "/login" })
      })
    },
  })

  useEffect(() => {
    if (isPending || isLoginPage) return
    const user = getAppUser(sessionData)
    if (!user || user.role !== "patient") {
      void navigate({ to: "/" })
    }
  }, [sessionData, isPending, navigate, isLoginPage])

  if (isLoginPage) return <Outlet />
  if (isPending) return null

  const user = getAppUser(sessionData)
  if (!user || user.role !== "patient") return null

  function handleLogout() {
    void authClient.signOut().then(() => {
      queryClient.removeQueries({ queryKey: ["session"] })
      void navigate({ to: "/login" })
    })
  }

  function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") return
    deleteMutation.mutate()
  }

  function handleSettingsClose(open: boolean) {
    if (!open) {
      setDeleteMode(false)
      setDeleteConfirm("")
    }
    setSettingsOpen(open)
  }

  const navItems = [
    {
      to: "/patient/dashboard" as const,
      icon: RiHeartPulseLine,
      label: "Home",
    },
    { to: "/patient/log" as const, icon: RiAddLine, label: "Log" },
    { to: "/patient/history" as const, icon: RiHistoryLine, label: "History" },
    { to: "/patient/access" as const, icon: RiShieldLine, label: "Access" },
  ]

  const displayName = user.firstName ?? user.name.split(" ")[0] ?? user.name

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <RiHeartPulseLine className="size-5 text-primary" />
            <span className="text-sm font-semibold tracking-wide">
              Maeterna
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{displayName}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSettingsOpen(true)}
              aria-label="Account settings"
            >
              <RiSettings3Line />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <RiLogoutBoxLine />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20">
        <div className="mx-auto w-full max-w-lg">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-lg items-center justify-around">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "size-5",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Account settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={handleSettingsClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account settings</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-2">
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-destructive">
                Delete account
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This will permanently delete all your readings, notes, access
                grants, and access log entries. This cannot be undone.
              </p>

              {!deleteMode ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={() => setDeleteMode(true)}
                >
                  Delete my account
                </Button>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-xs font-medium">
                    Type{" "}
                    <span className="font-mono font-bold tracking-widest">
                      DELETE
                    </span>{" "}
                    to confirm:
                  </p>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="DELETE"
                    autoComplete="off"
                  />
                  {deleteMutation.isError && (
                    <p className="text-xs text-destructive">
                      Failed to delete account. Please try again.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={
                        deleteConfirm !== "DELETE" || deleteMutation.isPending
                      }
                      onClick={handleDeleteAccount}
                    >
                      {deleteMutation.isPending
                        ? "Deleting…"
                        : "Confirm deletion"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDeleteMode(false)
                        setDeleteConfirm("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
