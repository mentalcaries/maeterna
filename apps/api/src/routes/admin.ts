import { createRoute, z } from "@hono/zod-openapi"
import { eq, and, sql, max } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"
import { createDb } from "../db"
import {
  user as userTable,
  patientProfile,
  doctorProfile,
  doctorAffiliation,
  institution,
  department,
  adminInvite,
  auditLog,
  mbttRegistry,
} from "../db/schema"
import { sessionMiddleware, requireRole } from "../middleware/session"
import {
  PatientSchema,
  DoctorSchema,
  AuditLogEntrySchema,
  RoleSchema,
  UserStatusSchema,
  responses,
} from "../schemas"
import { raise } from "../lib/errors"
import { syncMBTTRegistry } from "../lib/mbtt-sync"
import type { AppRouter } from "../types"
import type { DB } from "../db"

// ── Helpers ───────────────────────────────────────────────────────────────────

async function buildPatientResponse(db: DB, p: typeof userTable.$inferSelect) {
  const profile = await db
    .select()
    .from(patientProfile)
    .where(eq(patientProfile.userId, p.id))
    .get()
  return {
    id: p.id,
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    email: p.email,
    dateOfBirth: profile?.dateOfBirth ?? "",
    avatarUrl: p.image,
    role: "patient" as const,
    status: p.status as "active" | "suspended" | "pending_verification",
    createdAt: p.createdAt.toISOString(),
  }
}

async function buildDoctorResponse(db: DB, d: typeof userTable.$inferSelect) {
  const profile = await db
    .select()
    .from(doctorProfile)
    .where(eq(doctorProfile.userId, d.id))
    .get()
  const affs = await db
    .select({
      id: doctorAffiliation.id,
      institutionId: doctorAffiliation.institutionId,
      institutionName: institution.name,
      departmentId: doctorAffiliation.departmentId,
      departmentName: department.name,
    })
    .from(doctorAffiliation)
    .innerJoin(institution, eq(doctorAffiliation.institutionId, institution.id))
    .innerJoin(department, eq(doctorAffiliation.departmentId, department.id))
    .where(eq(doctorAffiliation.doctorId, d.id))

  return {
    id: d.id,
    firstName: d.firstName ?? "",
    lastName: d.lastName ?? "",
    email: d.email,
    registrationNumber: profile?.registrationNumber ?? "",
    verified: profile?.verified ?? false,
    role: "doctor" as const,
    status: d.status as "active" | "suspended" | "pending_verification",
    affiliations: affs,
    createdAt: d.createdAt.toISOString(),
  }
}

async function writeAuditLog(
  db: DB,
  actorId: string,
  action: string,
  targetId?: string
) {
  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    actorId,
    action,
    targetId: targetId ?? null,
    timestamp: new Date(),
  })
}

// ── Routes ────────────────────────────────────────────────────────────────────

const listUsersRoute = createRoute({
  method: "get",
  path: "/admin/users",
  tags: ["Admin"],
  summary: "List all users",
  request: {
    query: z.object({
      role: RoleSchema.optional(),
      status: UserStatusSchema.optional(),
      limit: z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(z.union([PatientSchema, DoctorSchema])),
            total: z.number().int(),
          }),
        },
      },
      description: "All users",
    },
    ...responses,
  },
})

const updateUserStatusRoute = createRoute({
  method: "patch",
  path: "/admin/users/{userId}/status",
  tags: ["Admin"],
  summary: "Suspend or reactivate a user account",
  request: {
    params: z.object({ userId: z.string().uuid() }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({ status: z.enum(["active", "suspended"]) }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.union([PatientSchema, DoctorSchema]) },
      },
      description: "Updated user",
    },
    ...responses,
  },
})

const approveDoctorRoute = createRoute({
  method: "post",
  path: "/admin/users/{userId}/approve",
  tags: ["Admin"],
  summary: "Approve a flagged doctor account",
  request: { params: z.object({ userId: z.string().uuid() }) },
  responses: {
    200: {
      content: { "application/json": { schema: DoctorSchema } },
      description: "Doctor approved",
    },
    ...responses,
  },
})

const sendAdminInviteRoute = createRoute({
  method: "post",
  path: "/admin/invites",
  tags: ["Admin"],
  summary: "Admin sends an invite to a patient or doctor",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
            role: z.enum(["patient", "doctor"]),
            name: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Invite sent" },
    ...responses,
  },
})

const syncMbttRoute = createRoute({
  method: "post",
  path: "/admin/sync-mbtt",
  tags: ["Admin"],
  summary: "Manually trigger MBTT registry sync",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ syncedAt: z.string(), count: z.number().int() }),
        },
      },
      description: "Sync complete",
    },
    ...responses,
  },
})

const mbttSyncStatusRoute = createRoute({
  method: "get",
  path: "/admin/sync-mbtt/status",
  tags: ["Admin"],
  summary: "Get current MBTT registry sync status",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            lastSyncedAt: z.string().nullable(),
            count: z.number().int(),
          }),
        },
      },
      description: "Registry status",
    },
    ...responses,
  },
})

const getAuditLogRoute = createRoute({
  method: "get",
  path: "/admin/audit-log",
  tags: ["Admin"],
  summary: "Get platform audit log",
  request: {
    query: z.object({
      limit: z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(AuditLogEntrySchema),
            total: z.number().int(),
          }),
        },
      },
      description: "Audit log entries, newest first",
    },
    ...responses,
  },
})

export function registerAdminRoutes(app: AppRouter) {
  app.use("/admin/*", sessionMiddleware)
  app.use("/admin/*", requireRole("admin"))

  // GET /admin/users
  app.openapi(listUsersRoute, async (c) => {
    const { role, status, limit, offset } = c.req.valid("query")
    const db = createDb(c.env.DB)

    let q = db.select().from(userTable).$dynamic()
    const conditions = []
    if (role) conditions.push(eq(userTable.role, role))
    if (status) conditions.push(eq(userTable.status, status))
    if (conditions.length > 0) q = q.where(and(...conditions))

    const allUsers = await q
    const total = allUsers.length
    const page = allUsers.slice(offset, offset + limit)

    const data = await Promise.all(
      page.map((u) =>
        u.role === "patient"
          ? buildPatientResponse(db, u)
          : buildDoctorResponse(db, u)
      )
    )

    return c.json({ data, total })
  })

  // PATCH /admin/users/{userId}/status
  app.openapi(updateUserStatusRoute, async (c) => {
    const admin = c.get("user")
    const { userId } = c.req.valid("param")
    const { status } = c.req.valid("json")
    const db = createDb(c.env.DB)

    const target = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .get()
    if (!target) raise(404, "User not found")

    await db
      .update(userTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(userTable.id, userId))
    await writeAuditLog(
      db,
      admin.id,
      status === "suspended" ? "SUSPEND_USER" : "REACTIVATE_USER",
      userId
    )

    const updated = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .get()
    const response =
      updated!.role === "patient"
        ? await buildPatientResponse(db, updated!)
        : await buildDoctorResponse(db, updated!)

    return c.json(response)
  })

  // POST /admin/users/{userId}/approve
  app.openapi(approveDoctorRoute, async (c) => {
    const admin = c.get("user")
    const { userId } = c.req.valid("param")
    const db = createDb(c.env.DB)

    const target = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .get()
    if (!target || target.role !== "doctor") raise(404, "Doctor not found")

    await db
      .update(userTable)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(userTable.id, userId))
    await db
      .update(doctorProfile)
      .set({ verified: true, updatedAt: new Date() })
      .where(eq(doctorProfile.userId, userId))
    await writeAuditLog(db, admin.id, "APPROVE_DOCTOR", userId)

    const updated = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .get()
    return c.json(await buildDoctorResponse(db, updated!))
  })

  // POST /admin/invites
  app.openapi(sendAdminInviteRoute, async (c) => {
    const admin = c.get("user")
    const body = c.req.valid("json")
    const db = createDb(c.env.DB)

    await db.insert(adminInvite).values({
      id: crypto.randomUUID(),
      email: body.email,
      role: body.role,
      name: body.name ?? null,
      sentAt: new Date(),
    })

    // TODO: send invitation email via email service
    await writeAuditLog(db, admin.id, "SEND_INVITE")
    return new Response(null, { status: 201 }) as never
  })

  // POST /admin/sync-mbtt
  app.openapi(syncMbttRoute, async (c) => {
    const admin = c.get("user")
    const db = createDb(c.env.DB)

    try {
      await syncMBTTRegistry(c.env.DB)
    } catch (err) {
      console.error("Admin-triggered MBTT sync failed:", err)
      throw new HTTPException(500, { message: "MBTT sync failed. Check logs." })
    }

    const result = await db
      .select({
        count: sql<number>`count(*)`,
        syncedAt: max(mbttRegistry.syncedAt),
      })
      .from(mbttRegistry)
      .get()

    await writeAuditLog(db, admin.id, "TRIGGER_MBTT_SYNC")
    return c.json({ syncedAt: result!.syncedAt ?? "", count: result!.count })
  })

  // GET /admin/sync-mbtt/status
  app.openapi(mbttSyncStatusRoute, async (c) => {
    const db = createDb(c.env.DB)

    const result = await db
      .select({
        count: sql<number>`count(*)`,
        lastSyncedAt: max(mbttRegistry.syncedAt),
      })
      .from(mbttRegistry)
      .get()

    return c.json({
      lastSyncedAt: result?.lastSyncedAt ?? null,
      count: result?.count ?? 0,
    })
  })

  // GET /admin/audit-log
  app.openapi(getAuditLogRoute, async (c) => {
    const { limit, offset } = c.req.valid("query")
    const db = createDb(c.env.DB)

    const allLogs = await db
      .select({
        id: auditLog.id,
        actorId: auditLog.actorId,
        action: auditLog.action,
        targetId: auditLog.targetId,
        timestamp: auditLog.timestamp,
        actorFirstName: userTable.firstName,
        actorLastName: userTable.lastName,
      })
      .from(auditLog)
      .innerJoin(userTable, eq(auditLog.actorId, userTable.id))
      .orderBy(auditLog.timestamp)

    const total = allLogs.length
    const page = allLogs.slice(offset, offset + limit)

    return c.json({
      data: page.map((l) => ({
        id: l.id,
        actorId: l.actorId,
        actorName:
          `${l.actorFirstName ?? ""} ${l.actorLastName ?? ""}`.trim() ||
          "Admin",
        action: l.action,
        targetId: l.targetId ?? null,
        targetName: null, // TODO: resolve target display name by userId lookup
        timestamp: l.timestamp.toISOString(),
      })),
      total,
    })
  })
}
