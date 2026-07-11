import { createRoute, z } from "@hono/zod-openapi"
import { eq, and } from "drizzle-orm"
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
    status: p.status as "active" | "suspended",
    createdAt: p.createdAt.toISOString(),
  }
}

function mapAffiliation(row: {
  id: string
  institutionId: string | null
  institutionName: string | null
  departmentId: string | null
  departmentName: string | null
  practiceName: string | null
}) {
  return {
    id: row.id,
    type: (row.institutionId ? "institution" : "practice") as
      | "institution"
      | "practice",
    institution: row.institutionId
      ? { id: row.institutionId, name: row.institutionName ?? "" }
      : null,
    department:
      row.institutionId && row.departmentId
        ? { id: row.departmentId, name: row.departmentName ?? "" }
        : null,
    practiceName: row.practiceName,
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
      practiceName: doctorAffiliation.practiceName,
    })
    .from(doctorAffiliation)
    .leftJoin(institution, eq(doctorAffiliation.institutionId, institution.id))
    .leftJoin(department, eq(doctorAffiliation.departmentId, department.id))
    .where(eq(doctorAffiliation.doctorId, d.id))
    .orderBy(doctorAffiliation.createdAt)

  return {
    id: d.id,
    firstName: d.firstName ?? "",
    lastName: d.lastName ?? "",
    email: d.email,
    registrationNumber: profile?.registrationNumber ?? null,
    phoneNumber: profile?.phoneNumber ?? null,
    role: "doctor" as const,
    status: d.status as "active" | "suspended",
    affiliations: affs.map(mapAffiliation),
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
    params: z.object({ userId: z.string().min(1) }),
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
