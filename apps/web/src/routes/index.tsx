import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { buttonVariants } from "@/components/button"
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
    <div className="min-h-screen overflow-x-clip bg-background pb-28">
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
            <Link
              to="/login"
              className={buttonVariants({
                size: "lg",
                className: "hidden sm:inline-flex",
              })}
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <div
            className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_16%,oklch(0.96_0.045_345),transparent_34%),radial-gradient(circle_at_88%_22%,oklch(0.94_0.05_300),transparent_36%),linear-gradient(to_bottom,oklch(0.99_0.012_85),white_72%)]"
            aria-hidden="true"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:py-24">
            <div className="flex flex-col items-start">
              <p className="mb-4 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                Maternal health, made simpler
              </p>
              <h1 className="max-w-2xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Your health readings, in your hands.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
                Log glucose and blood pressure readings with ease, stay close to
                your care team, and decide exactly who can see your data.
              </p>

              <Link
                to="/login"
                className={buttonVariants({
                  size: "lg",
                  className: "mt-8 w-full sm:w-auto",
                })}
              >
                Get started
              </Link>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div
                className="absolute -inset-6 -z-10 rounded-full bg-primary/10 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative mx-auto aspect-square max-w-88 rounded-full border border-primary/15 bg-[radial-gradient(circle_at_40%_35%,white_0%,oklch(0.98_0.04_80)_42%,oklch(0.94_0.06_340)_72%,oklch(0.9_0.07_300)_100%)] p-8 shadow-[0_24px_80px_-36px_oklch(0.45_0.16_320/0.45)] sm:max-w-108 sm:p-10">
                <img
                  src="/logo.png"
                  alt="Maeterna maternal health emblem"
                  className="size-full rounded-full object-contain drop-shadow-sm"
                />
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
          aria-labelledby="patient-benefits-heading"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Patient-first Experience
            </p>
            <h2
              id="patient-benefits-heading"
              className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Simplified Logging. Complete Control.
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Maeterna helps you record what matters and share it with the
              people you trust, without giving up ownership of your data.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
            <article className="rounded-xl border border-border bg-card p-6 shadow-xs sm:p-7">
              <ReadingLogIllustration />
              <h3 className="mt-6 text-xl font-semibold">
                Log Readings Easily
              </h3>
              <p className="mt-3 leading-7 text-muted-foreground">
                Record glucose and blood pressure readings in an intuitive and
                intelligent interface.
              </p>
            </article>

            <article className="rounded-xl border border-primary/25 bg-[linear-gradient(145deg,oklch(0.99_0.012_85),oklch(0.98_0.03_340))] p-6 shadow-[0_18px_50px_-36px_oklch(0.45_0.16_330/0.5)] sm:p-7">
              <DataPrivacyIllustration />
              <h3 className="mt-6 text-xl font-semibold">
                Your Privacy Comes First
              </h3>
              <p className="mt-3 leading-7 text-muted-foreground">
                Your readings belong to you. Grant or revoke access to your
                doctor or clinic staff, or delete your readings entirely.
              </p>
            </article>

            <article className="rounded-xl border border-border bg-card p-6 shadow-xs sm:p-7">
              <CareConnectionIllustration />
              <h3 className="mt-6 text-xl font-semibold">
                Keep Your Doctors Informed
              </h3>
              <p className="mt-3 leading-7 text-muted-foreground">
                Doctors you authorize can review readings in real time and
                adjust your treatment plan to suit.
              </p>
            </article>
          </div>
        </section>

        <DoctorBenefits />

        <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-primary/20 bg-[linear-gradient(120deg,oklch(0.97_0.045_340),oklch(0.96_0.04_300),oklch(0.98_0.035_80))] px-6 py-12 text-center sm:px-10 sm:py-16">
            <BotanicalDecoration />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Raising the Standard of Care.
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                A free and open source project brought to you by the Full Stack
                Collective.
              </p>
              <Link
                to="/login"
                className={buttonVariants({
                  size: "lg",
                  className: "mt-7 w-full sm:w-auto",
                })}
              >
                Start with Maeterna
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function ReadingLogIllustration() {
  return (
    <svg
      viewBox="0 0 128 72"
      className="h-16 w-28 text-primary"
      role="img"
      aria-label="Glucose and blood pressure entry fields"
    >
      <rect
        x="1"
        y="1"
        width="126"
        height="70"
        rx="14"
        fill="currentColor"
        fillOpacity="0.06"
        stroke="currentColor"
        strokeOpacity="0.16"
      />
      <path
        d="M27 17c-5 7-9 12-9 18a9 9 0 0 0 18 0c0-6-4-11-9-18Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path d="M49 22h29" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M49 31h18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.35"
      />
      <circle cx="103" cy="27" r="8" fill="currentColor" fillOpacity="0.14" />
      <path d="M99 27h8M103 23v8" stroke="currentColor" strokeWidth="2" />
      <path
        d="M18 53h92"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.16"
      />
      <circle cx="27" cy="53" r="4" fill="currentColor" />
      <circle cx="60" cy="53" r="4" fill="currentColor" fillOpacity="0.45" />
      <circle cx="93" cy="53" r="4" fill="currentColor" fillOpacity="0.2" />
    </svg>
  )
}

function DataPrivacyIllustration() {
  return (
    <svg
      viewBox="0 0 128 72"
      className="h-16 w-28 text-primary"
      role="img"
      aria-label="Patient-controlled data permissions"
    >
      <path
        d="M17 51c8-25 22-37 43-37 20 0 34 12 43 37"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.16"
      />
      <path
        d="M30 51c6-17 15-25 30-25s24 8 30 25"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.4"
      />
      <path
        d="M43 51c4-9 9-13 17-13s13 4 17 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <circle cx="60" cy="52" r="7" fill="currentColor" />
      <path
        d="M101 24h15v15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path d="m116 24-17 17" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="110" cy="54" r="5" fill="currentColor" fillOpacity="0.22" />
    </svg>
  )
}

function CareConnectionIllustration() {
  return (
    <svg
      viewBox="0 0 128 72"
      className="h-16 w-28 text-primary"
      role="img"
      aria-label="Readings flowing from patient to authorized care team"
    >
      <circle
        cx="24"
        cy="36"
        r="14"
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="24" cy="31" r="4" fill="currentColor" />
      <path
        d="M16 44c2-6 14-6 16 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M42 36h10l6-9 9 19 8-14 6 4h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="104"
        cy="36"
        r="14"
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="104" cy="31" r="4" fill="currentColor" />
      <path
        d="M96 44c2-6 14-6 16 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  )
}

function DoctorBenefits() {
  return (
    <section
      className="border-y border-border/70 bg-[linear-gradient(180deg,oklch(0.985_0.012_300),oklch(0.99_0.008_85))]"
      aria-labelledby="doctor-benefits-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            For doctors
          </p>
          <h2
            id="doctor-benefits-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            Check Patterns and Trends Remotely.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            With patient-granted access, care teams can follow readings as they
            are logged and review treatment with better context.
          </p>
        </div>

        <div className="mt-12 grid items-center gap-8 lg:grid-cols-[0.34fr_0.66fr] lg:gap-12">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              Trends over time
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              Blood Glucose at a Glance
            </h3>
            <p className="mt-3 leading-7 text-muted-foreground">
              Normal ranges, fasted and post-meal readings, and high values are
              visible in one continuous view, making changes easier to spot.
            </p>
          </div>
          <GlucoseTrendPreview />
        </div>

        <div className="mt-16 grid items-center gap-8 lg:grid-cols-[0.66fr_0.34fr] lg:gap-12">
          <ReadingHistoryPreview />
          <div className="lg:order-last">
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              Clear reading history
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              Understand the day in seconds
            </h3>
            <p className="mt-3 leading-7 text-muted-foreground">
              Readings are organized by date and meal context, so clinicians can
              scan for missing entries, compare values, and focus on exceptions.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function GlucoseTrendPreview() {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <figcaption className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="font-semibold">Glucose over time</span>
        <span className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            Fasted
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-0 border-x-4 border-b-7 border-x-transparent border-b-emerald-500" />
            Post-meal
          </span>
        </span>
      </figcaption>

      <svg
        viewBox="0 0 360 230"
        className="block h-auto w-full p-3 sm:hidden"
        role="img"
        aria-label="Illustrative glucose chart with normal ranges and one high reading"
      >
        <rect
          x="39"
          y="49"
          width="302"
          height="93"
          fill="var(--chart-2)"
          opacity="0.08"
        />
        <rect
          x="39"
          y="99"
          width="302"
          height="43"
          fill="var(--chart-2)"
          opacity="0.18"
        />
        <g stroke="var(--border)" strokeDasharray="4 5">
          <path d="M39 49h302M39 99h302M39 142h302M39 184h302" />
          <path d="M39 34v150M114 34v150M190 34v150M265 34v150M341 34v150" />
        </g>
        <g fill="var(--muted-foreground)" fontSize="10">
          <text x="5" y="53">
            140
          </text>
          <text x="10" y="103">
            95
          </text>
          <text x="10" y="188">
            65
          </text>
          <text x="39" y="210">
            Mon
          </text>
          <text x="177" y="210">
            Wed
          </text>
          <text x="318" y="210">
            Fri
          </text>
        </g>
        <path
          d="M39 91C66 65 87 73 114 121S166 119 190 90s48-37 75 11 48 45 76-55"
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <g stroke="var(--card)" strokeWidth="3">
          <circle cx="39" cy="91" r="6" fill="#22c55e" />
          <circle cx="114" cy="121" r="6" fill="#22c55e" />
          <circle cx="190" cy="90" r="6" fill="#22c55e" />
          <circle cx="265" cy="101" r="6" fill="#22c55e" />
          <circle cx="341" cy="46" r="7" fill="#ef4444" />
        </g>
      </svg>

      <svg
        viewBox="0 0 720 270"
        className="hidden h-auto w-full p-5 sm:block"
        role="img"
        aria-label="Illustrative glucose chart with normal ranges, fasted and post-meal readings, and one high reading"
      >
        <rect
          x="58"
          y="52"
          width="638"
          height="116"
          fill="var(--chart-2)"
          opacity="0.08"
        />
        <rect
          x="58"
          y="116"
          width="638"
          height="52"
          fill="var(--chart-2)"
          opacity="0.18"
        />
        <g stroke="var(--border)" strokeDasharray="4 5">
          <path d="M58 52h638M58 116h638M58 168h638M58 220h638" />
          <path d="M58 36v184M164 36v184M270 36v184M376 36v184M482 36v184M588 36v184M696 36v184" />
        </g>
        <g fill="var(--muted-foreground)" fontSize="11">
          <text x="16" y="56">
            140
          </text>
          <text x="21" y="120">
            95
          </text>
          <text x="21" y="224">
            65
          </text>
          <text x="58" y="250">
            14 Jul
          </text>
          <text x="253" y="250">
            16 Jul
          </text>
          <text x="465" y="250">
            18 Jul
          </text>
          <text x="658" y="250">
            20 Jul
          </text>
          <text x="66" y="69">
            Post-meal range
          </text>
          <text x="66" y="134">
            Fasted range
          </text>
        </g>
        <path
          d="M58 102C91 69 128 71 164 151s70-16 106-45 71-37 106 51 72-38 106-57 71-18 106 45 74-19 108-105"
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <g stroke="var(--card)" strokeWidth="3">
          <circle cx="58" cy="102" r="6" fill="#22c55e" />
          <circle cx="164" cy="151" r="6" fill="#22c55e" />
          <circle cx="376" cy="157" r="6" fill="#22c55e" />
          <circle cx="588" cy="145" r="6" fill="#22c55e" />
          <path d="m270 97 8 15h-16Z" fill="#22c55e" />
          <path d="m482 91 8 15h-16Z" fill="#22c55e" />
          <path d="m696 32 9 17h-18Z" fill="#ef4444" />
        </g>
      </svg>
    </figure>
  )
}

function ReadingHistoryPreview() {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <figcaption className="border-b border-border px-4 py-4 font-semibold sm:px-6">
        Reading history
      </figcaption>
      <div className="grid grid-cols-[3.5rem_repeat(2,minmax(0,1fr))] text-sm sm:grid-cols-[4.5rem_repeat(4,minmax(0,1fr))]">
        <HistoryHeading>Date</HistoryHeading>
        <HistoryHeading>Fasted</HistoryHeading>
        <HistoryHeading>Breakfast</HistoryHeading>
        <HistoryHeading className="hidden sm:block">Lunch</HistoryHeading>
        <HistoryHeading className="hidden sm:block">Dinner</HistoryHeading>

        <HistoryDate day="20" />
        <HistoryCell muted>--</HistoryCell>
        <HistoryCell high>148</HistoryCell>
        <HistoryCell className="hidden sm:block" muted>
          --
        </HistoryCell>
        <HistoryCell className="hidden sm:block" muted>
          --
        </HistoryCell>

        <HistoryDate day="17" />
        <HistoryCell>78</HistoryCell>
        <HistoryCell>100</HistoryCell>
        <HistoryCell className="hidden sm:block">105</HistoryCell>
        <HistoryCell className="hidden sm:block">110</HistoryCell>

        <HistoryDate day="16" />
        <HistoryCell>81</HistoryCell>
        <HistoryCell>105</HistoryCell>
        <HistoryCell className="hidden sm:block">109</HistoryCell>
        <HistoryCell className="hidden sm:block">118</HistoryCell>

        <HistoryDate day="15" last />
        <HistoryCell last>84</HistoryCell>
        <HistoryCell last>110</HistoryCell>
        <HistoryCell className="hidden sm:block" last>
          113
        </HistoryCell>
        <HistoryCell className="hidden sm:block" last>
          126
        </HistoryCell>
      </div>
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-6">
        Values shown in mg/dL
      </p>
    </figure>
  )
}

function HistoryHeading({
  className = "",
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`border-b border-border bg-muted/35 px-2 py-3 text-xs font-semibold text-muted-foreground uppercase sm:px-3 ${className}`}
    >
      {children}
    </div>
  )
}

function HistoryDate({ day, last = false }: { day: string; last?: boolean }) {
  return (
    <div
      className={`px-2 py-4 font-semibold sm:px-3 ${last ? "" : "border-b border-border"}`}
    >
      {day}
      <span className="block text-xs font-normal text-muted-foreground">
        Jul
      </span>
    </div>
  )
}

function HistoryCell({
  children,
  className = "",
  high = false,
  muted = false,
  last = false,
}: {
  children: React.ReactNode
  className?: string
  high?: boolean
  muted?: boolean
  last?: boolean
}) {
  return (
    <div
      className={`px-2 py-4 sm:px-3 ${last ? "" : "border-b border-border"} ${className}`}
    >
      <span
        className={
          high
            ? "inline-flex items-center gap-1.5 rounded-md bg-red-50 px-1.5 py-0.5 font-semibold text-red-700"
            : muted
              ? "text-muted-foreground"
              : "inline-flex items-center gap-1.5 font-medium"
        }
      >
        {!muted && (
          <span
            className={`size-2 rounded-full ${high ? "bg-red-500" : "bg-emerald-500"}`}
          />
        )}
        {children}
      </span>
    </div>
  )
}

function BotanicalDecoration() {
  return (
    <svg
      viewBox="0 0 180 180"
      className="absolute -top-12 -right-10 size-48 text-primary/10 sm:size-56"
      aria-hidden="true"
    >
      <path
        d="M41 157C76 119 97 79 110 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M91 84C60 72 50 52 54 33c25 8 39 25 37 51Z"
        fill="currentColor"
      />
      <path
        d="M102 53c7-26 23-39 43-41 0 24-13 40-43 41Z"
        fill="currentColor"
      />
      <path d="M75 116c-29-2-46 9-53 29 25 8 43-1 53-29Z" fill="currentColor" />
      <path
        d="M82 102c22-12 42-10 56 4-17 19-37 18-56-4Z"
        fill="currentColor"
      />
    </svg>
  )
}
