import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { buttonVariants } from "@/components/button"
import { DoctorBenefits } from "@/components/landing/DoctorBenefits"
import { LandingCta } from "@/components/landing/LandingCta"
import { LandingHero } from "@/components/landing/LandingHero"
import { PatientBenefits } from "@/components/landing/PatientBenefits"
import { authClient, getAppUser } from "@/lib/auth-client"

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    const user = getAppUser(session)

    if (!user) return

    if (!user.role) throw redirect({ to: "/signup/select-role" })

    if (user.role === "patient") {
      if (!user.firstName) throw redirect({ to: "/signup/patient" })
      throw redirect({ to: "/patient/dashboard" })
    }
    if (user.role === "doctor") {
      if (!user.firstName) throw redirect({ to: "/signup/doctor" })
      throw redirect({ to: "/doctor/dashboard" })
    }
    throw redirect({ to: "/admin/dashboard" })
  },
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2.5 text-foreground transition-opacity hover:opacity-80"
            aria-label="Maeterna home"
          >
            <img
              src="/logo.png"
              alt=""
              className="size-11 shrink-0 rounded-full"
            />
            <span className="truncate text-base font-semibold tracking-wide">
              Maeterna
            </span>
          </Link>

          <nav className="flex items-center gap-2" aria-label="Account">
            <Link
              to="/login"
              className={buttonVariants({
                variant: "ghost",
                size: "lg",
                className: "px-4",
              })}
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <LandingHero />
        <PatientBenefits />
        <DoctorBenefits />
        <LandingCta />
      </main>
    </div>
  )
}
