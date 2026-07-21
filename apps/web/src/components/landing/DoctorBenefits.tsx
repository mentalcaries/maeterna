export function DoctorBenefits() {
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
