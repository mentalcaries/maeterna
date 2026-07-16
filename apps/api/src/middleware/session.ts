import { createMiddleware } from "hono/factory"
import { getAuth } from "../lib/auth"
import type { AppEnv, SessionUser } from "../types"

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const auth = getAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session?.user) {
    return c.json(
      { code: "UNAUTHORIZED", message: "Missing or invalid session token" },
      401
    )
  }

  const u = session.user as Record<string, unknown>
  const status = ((u.status as string) ?? "active") as SessionUser["status"]

  if (status === "suspended") {
    return c.json(
      {
        code: "ACCOUNT_SUSPENDED",
        message: "This account has been suspended.",
      },
      403
    )
  }

  c.set("user", {
    id: u.id as string,
    email: u.email as string,
    name: (u.name ?? "") as string,
    image: (u.image ?? null) as string | null,
    role: ((u.role as string) ?? null) as SessionUser["role"],
    status,
    firstName: (u.firstName ?? null) as string | null,
    lastName: (u.lastName ?? null) as string | null,
    createdAt: new Date(u.createdAt as string | number),
  })

  await next()
})

export function requireRole(role: SessionUser["role"]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user")
    if (!user || user.role !== role) {
      return c.json(
        {
          code: "FORBIDDEN",
          message: "You are not authorised to perform this action",
        },
        403
      )
    }
    await next()
  })
}
