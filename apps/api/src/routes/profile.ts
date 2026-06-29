import { createRoute, z } from "@hono/zod-openapi"
import { eq } from "drizzle-orm"
import { createDb } from "../db"
import {
  user as userTable,
  patientProfile,
  doctorProfile,
  doctorAffiliation,
  institution,
  department,
  mbttRegistry,
} from "../db/schema"
import { sessionMiddleware } from "../middleware/session"
import {
  PatientSchema,
  DoctorSchema,
  DoctorVerificationFailedSchema,
  ErrorSchema,
  responses,
} from "../schemas"
import { raise } from "../lib/errors"
import { isValidRegistration } from "../lib/mbtt"
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
            registrationNumber: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.union([
            PatientSchema,
            DoctorSchema,
            DoctorVerificationFailedSchema,
          ]),
        },
      },
      description: "Profile saved",
    },
    ...responses,
  },
})

const saveAffiliationsRoute = createRoute({
  method: "put",
  path: "/profile/doctor/affiliations",
  tags: ["Profile"],
  summary: "Save doctor institution and department affiliations",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            affiliations: z
              .array(
                z.object({
                  institutionId: z.string().uuid(),
                  departmentId: z.string().uuid(),
                })
              )
              .min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: DoctorSchema } },
      description: "Affiliations saved",
    },
    ...responses,
  },
})

const submitForReviewRoute = createRoute({
  method: "post",
  path: "/profile/complete/submit-for-review",
  tags: ["Profile"],
  summary: "Submit doctor profile for manual MBTT verification review",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            registrationNumber: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: DoctorSchema } },
      description: "Submitted for review",
    },
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
          schema: z.object({ role: z.enum(["patient", "doctor"]) }),
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
    await db
      .update(userTable)
      .set({ role, updatedAt: new Date() })
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

    // doctor — compute verification first, no DB writes on failure
    if (!body.registrationNumber)
      raise(422, "registrationNumber is required for doctors")

    const registryEntry = await db
      .select()
      .from(mbttRegistry)
      .where(eq(mbttRegistry.memberId, body.registrationNumber))
      .get()

    const isNameMatch = (() => {
      if (!registryEntry) return false
      const registryFirstNames = registryEntry.firstName
        .toLowerCase()
        .split(" ")
      const isFirstNameMatch = registryFirstNames.includes(
        body.firstName.toLowerCase()
      )
      const isLastNameMatch =
        registryEntry.lastName.toLowerCase() === body.lastName.toLowerCase()
      return isFirstNameMatch && isLastNameMatch
    })()

    const verified =
      registryEntry !== undefined &&
      isValidRegistration(registryEntry.status) &&
      isNameMatch

    if (!verified) {
      return c.json({ verificationFailed: true as const }, 200)
    }

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
        verified: true,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: doctorProfile.userId,
        set: {
          registrationNumber: body.registrationNumber,
          verified: true,
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
      registrationNumber: profile?.registrationNumber ?? "",
      verified: true,
      role: updated!.role as "doctor",
      status: updated!.status as "active",
      affiliations: [],
      createdAt: updated!.createdAt.toISOString(),
    })
  })

  // POST /profile/complete/submit-for-review
  app.openapi(submitForReviewRoute, async (c) => {
    const currentUser = c.get("user")
    if (currentUser.role !== "doctor")
      raise(403, "Only doctors can submit for review")
    const body = c.req.valid("json")
    const db = createDb(c.env.DB)
    const now = new Date()

    await db
      .update(userTable)
      .set({
        firstName: body.firstName,
        lastName: body.lastName,
        name: `${body.firstName} ${body.lastName}`,
        status: "pending_verification",
        updatedAt: now,
      })
      .where(eq(userTable.id, currentUser.id))

    await db
      .insert(doctorProfile)
      .values({
        id: crypto.randomUUID(),
        userId: currentUser.id,
        registrationNumber: body.registrationNumber,
        verified: false,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: doctorProfile.userId,
        set: {
          registrationNumber: body.registrationNumber,
          verified: false,
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
      registrationNumber: profile?.registrationNumber ?? "",
      verified: false,
      role: updated!.role as "doctor",
      status: "pending_verification" as const,
      affiliations: [],
      createdAt: updated!.createdAt.toISOString(),
    })
  })

  // PUT /profile/doctor/affiliations
  app.openapi(saveAffiliationsRoute, async (c) => {
    const currentUser = c.get("user")
    if (currentUser.role !== "doctor")
      raise(403, "Only doctors can manage affiliations")

    const { affiliations } = c.req.valid("json")
    const db = createDb(c.env.DB)

    await db
      .delete(doctorAffiliation)
      .where(eq(doctorAffiliation.doctorId, currentUser.id))
    if (affiliations.length > 0) {
      await db.insert(doctorAffiliation).values(
        affiliations.map((a) => ({
          id: crypto.randomUUID(),
          doctorId: currentUser.id,
          institutionId: a.institutionId,
          departmentId: a.departmentId,
        }))
      )
    }

    const doctorUser = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, currentUser.id))
      .get()
    const profile = await db
      .select()
      .from(doctorProfile)
      .where(eq(doctorProfile.userId, currentUser.id))
      .get()
    const affRows = await db
      .select({
        institutionId: doctorAffiliation.institutionId,
        institutionName: institution.name,
        departmentId: doctorAffiliation.departmentId,
        departmentName: department.name,
      })
      .from(doctorAffiliation)
      .innerJoin(
        institution,
        eq(doctorAffiliation.institutionId, institution.id)
      )
      .innerJoin(department, eq(doctorAffiliation.departmentId, department.id))
      .where(eq(doctorAffiliation.doctorId, currentUser.id))

    return c.json({
      id: doctorUser!.id,
      firstName: doctorUser!.firstName ?? "",
      lastName: doctorUser!.lastName ?? "",
      email: doctorUser!.email,
      registrationNumber: profile?.registrationNumber ?? "",
      verified: profile?.verified ?? false,
      role: "doctor" as const,
      status: doctorUser!.status as "active",
      affiliations: affRows,
      createdAt: doctorUser!.createdAt.toISOString(),
    })
  })
}
