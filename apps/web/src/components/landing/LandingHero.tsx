import { Link } from "@tanstack/react-router"
import { buttonVariants } from "@/components/button"

export function LandingHero() {
  return (
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
            Healthy Mom, Healthy Baby.
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
  )
}
