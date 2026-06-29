import type { OpenAPIHono } from "@hono/zod-openapi"

export type SessionUser = {
  id: string
  email: string
  name: string
  image: string | null
  role: "patient" | "doctor" | "admin" | null
  status: "active" | "suspended" | "pending_verification"
  firstName: string | null
  lastName: string | null
  createdAt: Date
}

export type AppVariables = {
  user: SessionUser
}

export type AppEnv = {
  Bindings: CloudflareBindings
  Variables: AppVariables
}

export type AppRouter = OpenAPIHono<AppEnv>
