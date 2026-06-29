import { createRootRoute, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

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
  return (
    <>
      <Outlet />
      <footer className="fixed right-0 bottom-0 left-0 z-30 border-t border-border bg-background py-2 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()}{" "}
        <a href="https://fullstackcollective.com">Full Stack Collective</a>
      </footer>
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}
