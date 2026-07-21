import { Link } from "@tanstack/react-router"
import { buttonVariants } from "@/components/button"

export function LandingCta() {
  return (
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
