import { createRoute, z } from "@hono/zod-openapi"
import { eq } from "drizzle-orm"
import { createDb } from "../db"
import {
  invite,
  department,
  institution,
  user as userTable,
} from "../db/schema"
import { sessionMiddleware, requireRole } from "../middleware/session"
import { InviteSchema, ErrorSchema, responses } from "../schemas"
import { raise } from "../lib/errors"
import type { AppRouter } from "../types"

const INVITE_TTL_HOURS = 72

const createInviteRoute = createRoute({
  method: "post",
  path: "/invites",
  tags: ["Invites"],
  summary: "Doctor creates a patient invite link",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({ departmentId: z.string().uuid() }),
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: InviteSchema } },
      description: "Invite created",
    },
    ...responses,
  },
})

const resolveInviteRoute = createRoute({
  method: "get",
  path: "/invites/{token}",
  tags: ["Invites"],
  summary: "Resolve an invite token",
  security: [],
  request: { params: z.object({ token: z.string() }) },
  responses: {
    200: {
      content: { "application/json": { schema: InviteSchema } },
      description: "Invite details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
    410: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Expired",
    },
  },
})

type CreateDbReturn = ReturnType<typeof createDb>

async function buildInviteResponse(
  db: CreateDbReturn,
  inv: typeof invite.$inferSelect
) {
  const doctor = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, inv.doctorId))
    .get()
  const dept = await db
    .select({ deptName: department.name, instName: institution.name })
    .from(department)
    .innerJoin(institution, eq(department.institutionId, institution.id))
    .where(eq(department.id, inv.departmentId))
    .get()

  return {
    id: inv.id,
    token: inv.token,
    doctorId: inv.doctorId,
    doctorName:
      `Dr. ${doctor?.firstName ?? ""} ${doctor?.lastName ?? ""}`.trim(),
    institutionName: dept?.instName ?? "",
    departmentName: dept?.deptName ?? "",
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }
}

export function registerInviteRoutes(app: AppRouter) {
  app.use("/invites", sessionMiddleware)
  app.use("/invites", requireRole("doctor"))

  // POST /invites
  app.openapi(createInviteRoute, async (c) => {
    const doctor = c.get("user")
    const { departmentId } = c.req.valid("json")
    const db = createDb(c.env.DB)

    const now = new Date()
    const expiresAt = new Date(
      now.getTime() + INVITE_TTL_HOURS * 60 * 60 * 1000
    )
    const token = crypto.randomUUID().replace(/-/g, "")

    const newInvite = {
      id: crypto.randomUUID(),
      token,
      doctorId: doctor.id,
      departmentId,
      expiresAt,
      createdAt: now,
    }
    await db.insert(invite).values(newInvite)
    return c.json(await buildInviteResponse(db, newInvite), 201)
  })

  // GET /invites/{token} — no auth required
  app.openapi(resolveInviteRoute, async (c) => {
    const { token } = c.req.valid("param")
    const db = createDb(c.env.DB)

    const inv = await db
      .select()
      .from(invite)
      .where(eq(invite.token, token))
      .get()
    if (!inv) raise(404, "Invite not found")
    if (inv.expiresAt < new Date()) raise(410, "Invite has expired")

    return c.json(await buildInviteResponse(db, inv), 200)
  })
}
