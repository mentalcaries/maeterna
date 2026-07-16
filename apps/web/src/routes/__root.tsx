import { createRootRoute, Outlet } from "@tanstack/react-router"
import { useSyncExternalStore } from "react"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { AccountSuspendedScreen } from "@/components/AccountSuspendedScreen"
import {
  isAccountSuspended,
  subscribeAccountSuspended,
} from "@/lib/account-suspended"

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
    <>
      {suspended ? <AccountSuspendedScreen /> : <Outlet />}
      <footer className="fixed right-0 bottom-0 left-0 z-30 border-t border-border bg-background py-2 text-center text-sm text-muted-foreground">
        <span>
          &copy; {new Date().getFullYear()}{" "}
          <a href="https://fullstackcollective.com">Full Stack Collective</a>
        </span>
        <nav className="inline-flex gap-3 pl-3" aria-label="Legal">
          <a href="/privacy.html" className="underline underline-offset-2">
            Privacy Policy
          </a>
          <a href="/terms.html" className="underline underline-offset-2">
            Terms of Service
          </a>
        </nav>
      </footer>
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}
