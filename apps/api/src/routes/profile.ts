import { createRoute, z } from "@hono/zod-openapi"
import { and, eq, isNull, sql } from "drizzle-orm"
import { createDb } from "../db"
import {
  user as userTable,
  patientProfile,
  doctorProfile,
  doctorAffiliation,
  institution,
  department,
} from "../db/schema"
import { sessionMiddleware } from "../middleware/session"
import {
  PatientSchema,
  DoctorSchema,
  DoctorAffiliationSchema,
  RegistrationNumberSchema,
  PhoneNumberSchema,
  ErrorSchema,
  responses,
} from "../schemas"
import { raise, isUniqueConstraintError } from "../lib/errors"
import { mapAffiliation } from "../lib/affiliations"
import type { AppRouter } from "../types"

const completeProfileRoute = createRoute({
  method: "post",
  path: "/profile/complete",
  tags: ["Profile"],
  summary: "Complete profile after first sign-in",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            dateOfBirth: z.string().optional(),
            registrationNumber: RegistrationNumberSchema.optional(),
            phoneNumber: PhoneNumberSchema.optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.union([PatientSchema, DoctorSchema]),
        },
      },
      description: "Profile saved",
    },
    ...responses,
  },
})

const listAffiliationsRoute = createRoute({
  method: "get",
  path: "/profile/doctor/affiliations",
  tags: ["Profile"],
  summary: "List own doctor affiliations",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(DoctorAffiliationSchema) },
      },
      description: "Own affiliations",
    },
    ...responses,
  },
})

const createAffiliationRoute = createRoute({
  method: "post",
  path: "/profile/doctor/affiliations",
  tags: ["Profile"],
  summary: "Add a doctor institution or private-practice affiliation",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.union([
            z.object({
              institutionId: z.string().uuid(),
              departmentId: z.string().uuid().optional(),
            }),
            z.object({
              practiceName: z.string().trim().min(1).max(120),
            }),
          ]),
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: DoctorAffiliationSchema } },
      description: "Affiliation created",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Duplicate affiliation",
    },
    ...responses,
  },
})

const deleteAffiliationRoute = createRoute({
  method: "delete",
  path: "/profile/doctor/affiliations/{affiliationId}",
  tags: ["Profile"],
  summary: "Remove a single doctor affiliation",
  request: { params: z.object({ affiliationId: z.string().uuid() }) },
  responses: {
    204: { description: "Affiliation deleted" },
    ...responses,
  },
})

const setRoleRoute = createRoute({
  method: "patch",
  path: "/profile/role",
  tags: ["Profile"],
  summary: "Set role for a new user who has no role yet",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            role: z.enum(["patient", "doctor"]),
            termsAccepted: z.literal(true),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.object({ role: z.string() }) },
      },
      description: "Role set",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Role already set",
    },
    ...responses,
  },
})

export function registerProfileRoutes(app: AppRouter) {
  app.use("/profile/*", sessionMiddleware)

  // PATCH /profile/role
  app.openapi(setRoleRoute, async (c) => {
    const currentUser = c.get("user")
    if (currentUser.role !== null) {
      return c.json(
        { code: "CONFLICT" as const, message: "Role is already set" },
        409
      )
    }
    const { role } = c.req.valid("json")
    const db = createDb(c.env.DB)
    const now = new Date()
    await db
      .update(userTable)
      .set({ role, termsAcceptedAt: now, updatedAt: now })
      .where(eq(userTable.id, currentUser.id))
    return c.json({ role }, 200)
  })

  // POST /profile/complete
  app.openapi(completeProfileRoute, async (c) => {
    const currentUser = c.get("user")
    const body = c.req.valid("json")
    const db = createDb(c.env.DB)
    const now = new Date()

    if (currentUser.role === "patient") {
      if (!body.dateOfBirth) raise(422, "dateOfBirth is required for patients")

      await db
        .update(userTable)
        .set({
          firstName: body.firstName,
          lastName: body.lastName,
          name: `${body.firstName} ${body.lastName}`,
          updatedAt: now,
        })
        .where(eq(userTable.id, currentUser.id))

      await db
        .insert(patientProfile)
        .values({
          id: crypto.randomUUID(),
          userId: currentUser.id,
          dateOfBirth: body.dateOfBirth,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: patientProfile.userId,
          set: { dateOfBirth: body.dateOfBirth, updatedAt: now },
        })

      const updated = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, currentUser.id))
        .get()
      const profile = await db
        .select()
        .from(patientProfile)
        .where(eq(patientProfile.userId, currentUser.id))
        .get()

      return c.json({
        id: updated!.id,
        firstName: updated!.firstName ?? "",
        lastName: updated!.lastName ?? "",
        email: updated!.email,
        dateOfBirth: profile?.dateOfBirth ?? "",
        avatarUrl: updated!.image,
        role: updated!.role as "patient",
        status: updated!.status as "active",
        createdAt: updated!.createdAt.toISOString(),
      })
    }

    // doctor — self-attested, no external verification
    if (!body.registrationNumber)
      raise(422, "registrationNumber is required for doctors")
    if (!body.phoneNumber) raise(422, "phoneNumber is required for doctors")

    await db
      .update(userTable)
      .set({
        firstName: body.firstName,
        lastName: body.lastName,
        name: `${body.firstName} ${body.lastName}`,
        status: "active",
        updatedAt: now,
      })
      .where(eq(userTable.id, currentUser.id))

    await db
      .insert(doctorProfile)
      .values({
        id: crypto.randomUUID(),
        userId: currentUser.id,
        registrationNumber: body.registrationNumber,
        phoneNumber: body.phoneNumber,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: doctorProfile.userId,
        set: {
          registrationNumber: body.registrationNumber,
          phoneNumber: body.phoneNumber,
          updatedAt: now,
        },
      })

    const updated = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, currentUser.id))
      .get()
    const profile = await db
      .select()
      .from(doctorProfile)
      .where(eq(doctorProfile.userId, currentUser.id))
      .get()

    return c.json({
      id: updated!.id,
      firstName: updated!.firstName ?? "",
      lastName: updated!.lastName ?? "",
      email: updated!.email,
      registrationNumber: profile?.registrationNumber ?? null,
      phoneNumber: profile?.phoneNumber ?? null,
      role: updated!.role as "doctor",
      status: updated!.status as "active",
      affiliations: [],
      createdAt: updated!.createdAt.toISOString(),
    })
  })

  // DELETE /profile/doctor/affiliations/:affiliationId
  app.openapi(deleteAffiliationRoute, async (c) => {
    const currentUser = c.get("user")
    if (currentUser.role !== "doctor")
      raise(403, "Only doctors can manage affiliations")
    const { affiliationId } = c.req.valid("param")
    const db = createDb(c.env.DB)
    await db
      .delete(doctorAffiliation)
      .where(
        and(
          eq(doctorAffiliation.id, affiliationId),
          eq(doctorAffiliation.doctorId, currentUser.id)
        )
      )
    return new Response(null, { status: 204 }) as never
  })

  // GET /profile/doctor/affiliations
  app.openapi(listAffiliationsRoute, async (c) => {
    const currentUser = c.get("user")
    if (currentUser.role !== "doctor")
      raise(403, "Only doctors can manage affiliations")
    const db = createDb(c.env.DB)

    const rows = await db
      .select({
        id: doctorAffiliation.id,
        institutionId: doctorAffiliation.institutionId,
        institutionName: institution.name,
        departmentId: doctorAffiliation.departmentId,
        departmentName: department.name,
        practiceName: doctorAffiliation.practiceName,
      })
      .from(doctorAffiliation)
      .leftJoin(
        institution,
        eq(doctorAffiliation.institutionId, institution.id)
      )
      .leftJoin(department, eq(doctorAffiliation.departmentId, department.id))
      .where(eq(doctorAffiliation.doctorId, currentUser.id))
      .orderBy(doctorAffiliation.createdAt)

    return c.json(rows.map(mapAffiliation))
  })

  // POST /profile/doctor/affiliations
  app.openapi(createAffiliationRoute, async (c) => {
    const currentUser = c.get("user")
    if (currentUser.role !== "doctor")
      raise(403, "Only doctors can manage affiliations")
    const body = c.req.valid("json")
    const db = createDb(c.env.DB)
    const now = new Date()

    if ("institutionId" in body) {
      const inst = await db
        .select()
        .from(institution)
        .where(eq(institution.id, body.institutionId))
        .get()
      if (!inst) raise(404, "Institution not found")

      let dept: { id: string; name: string } | null = null
      if (body.departmentId) {
        const deptRow = await db
          .select()
          .from(department)
          .where(eq(department.id, body.departmentId))
          .get()
        if (!deptRow || deptRow.institutionId !== body.institutionId)
          raise(422, "Department does not belong to institution")
        dept = { id: deptRow.id, name: deptRow.name }
      }

      const existing = await db
        .select({ id: doctorAffiliation.id })
        .from(doctorAffiliation)
        .where(
          and(
            eq(doctorAffiliation.doctorId, currentUser.id),
            eq(doctorAffiliation.institutionId, body.institutionId),
            dept
              ? eq(doctorAffiliation.departmentId, dept.id)
              : isNull(doctorAffiliation.departmentId)
          )
        )
        .get()
      if (existing) raise(409, "Affiliation already exists")

      const id = crypto.randomUUID()
      try {
        await db.insert(doctorAffiliation).values({
          id,
          doctorId: currentUser.id,
          institutionId: body.institutionId,
          departmentId: dept?.id ?? null,
          practiceName: null,
          createdAt: now,
        })
      } catch (err) {
        if (isUniqueConstraintError(err))
          raise(409, "Affiliation already exists")
        throw err
      }

      return c.json(
        {
          id,
          type: "institution" as const,
          institution: { id: inst.id, name: inst.name },
          department: dept,
          practiceName: null,
        },
        201
      )
    }

    // practice
    const practiceName = body.practiceName.trim()
    const existing = await db
      .select({ id: doctorAffiliation.id })
      .from(doctorAffiliation)
      .where(
        and(
          eq(doctorAffiliation.doctorId, currentUser.id),
          sql`lower(${doctorAffiliation.practiceName}) = lower(${practiceName})`
        )
      )
      .get()
    if (existing) raise(409, "Affiliation already exists")

    const id = crypto.randomUUID()
    await db.insert(doctorAffiliation).values({
      id,
      doctorId: currentUser.id,
      institutionId: null,
      departmentId: null,
      practiceName,
      createdAt: now,
    })

    return c.json(
      {
        id,
        type: "practice" as const,
        institution: null,
        department: null,
        practiceName,
      },
      201
    )
  })
}
