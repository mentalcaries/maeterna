export function PatientBenefits() {
  return (
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
          Maeterna helps you record what matters and share it with the people
          you trust, without giving up ownership of your data.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
        <article className="rounded-xl border border-border bg-card p-6 shadow-xs sm:p-7">
          <ReadingLogIllustration />
          <h3 className="mt-6 text-xl font-semibold">Log Readings Easily</h3>
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
            Your readings belong to you. Grant or revoke access to your doctor
            or clinic staff, or delete your readings entirely.
          </p>
        </article>

        <article className="rounded-xl border border-border bg-card p-6 shadow-xs sm:p-7">
          <CareConnectionIllustration />
          <h3 className="mt-6 text-xl font-semibold">
            Keep Your Doctors Informed
          </h3>
          <p className="mt-3 leading-7 text-muted-foreground">
            Doctors you authorize can review readings in real time and adjust
            your treatment plan to suit.
          </p>
        </article>
      </div>
    </section>
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
