import { createRootRoute, Outlet } from "@tanstack/react-router"
import { lazy, Suspense, useSyncExternalStore } from "react"
import { AccountSuspendedScreen } from "@/components/AccountSuspendedScreen"
import {
  isAccountSuspended,
  subscribeAccountSuspended,
} from "@/lib/account-suspended"

const DevelopmentTools = import.meta.env.DEV
  ? lazy(async () => {
      const [{ TanStackRouterDevtools }, { ReactQueryDevtools }] =
        await Promise.all([
          import("@tanstack/react-router-devtools"),
          import("@tanstack/react-query-devtools"),
        ])

      return {
        default: function DevelopmentTools() {
          return (
            <>
              <TanStackRouterDevtools position="bottom-right" />
              <ReactQueryDevtools initialIsOpen={false} />
            </>
          )
        },
      }
    })
  : null

export const Route = createRootRoute({
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="text-muted-foreground">Page not found.</p>
    </main>
  ),
  component: RootComponent,
})

function RootComponent() {
  const suspended = useSyncExternalStore(
    subscribeAccountSuspended,
    isAccountSuspended
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        {suspended ? <AccountSuspendedScreen /> : <Outlet />}
      </div>
      <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-border bg-background px-4 py-3 text-center text-sm text-muted-foreground">
        <span>
          &copy; {new Date().getFullYear()}{" "}
          <a href="https://fullstackcollective.com">Full Stack Collective</a>
        </span>
        <nav className="inline-flex gap-3" aria-label="Legal">
          <a href="/privacy.html" className="underline underline-offset-2">
            Privacy Policy
          </a>
          <a href="/terms.html" className="underline underline-offset-2">
            Terms of Service
          </a>
        </nav>
      </footer>
      {DevelopmentTools && (
        <Suspense fallback={null}>
          <DevelopmentTools />
        </Suspense>
      )}
    </div>
  )
}
