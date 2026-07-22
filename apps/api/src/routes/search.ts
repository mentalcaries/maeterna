import { createRoute, z } from "@hono/zod-openapi"
import { eq, like, or, and, inArray } from "drizzle-orm"
import { createDb } from "../db"
import {
  user as userTable,
  doctorProfile,
  doctorAffiliation,
  institution,
} from "../db/schema"
import { resolveInstitutionDepartmentIds } from "../lib/affiliations"
import { sessionMiddleware } from "../middleware/session"
import { responses } from "../schemas"
import type { AppRouter } from "../types"

const searchDoctorAffiliationSchema = z.object({
  type: z.enum(["institution", "practice"]),
  institutionId: z.string().uuid().nullable(),
  departmentId: z.string().uuid().nullable(),
  displayName: z.string(),
})

const searchDoctorsRoute = createRoute({
  method: "get",
  path: "/search/doctors",
  tags: ["Doctors"],
  summary: "Search doctors by name",
  request: {
    query: z.object({
      q: z.string().trim().min(2),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              registrationNumber: z.string(),
              affiliations: z.array(searchDoctorAffiliationSchema),
            })
          ),
        },
      },
      description: "Matching doctors",
    },
    ...responses,
  },
})

export function registerSearchRoutes(app: AppRouter) {
  app.use("/search/doctors", sessionMiddleware)

  app.openapi(searchDoctorsRoute, async (c) => {
    const { q, limit } = c.req.valid("query")
    const db = createDb(c.env.DB)
    const terms = q.split(/\s+/)

    const doctors = await db
      .select({
        id: userTable.id,
        firstName: userTable.firstName,
        lastName: userTable.lastName,
        registrationNumber: doctorProfile.registrationNumber,
      })
      .from(userTable)
      .leftJoin(doctorProfile, eq(doctorProfile.userId, userTable.id))
      .where(
        and(
          eq(userTable.role, "doctor"),
          eq(userTable.status, "active"),
          ...terms.map((term) => {
            const pattern = `%${term}%`
            return or(
              like(userTable.firstName, pattern),
              like(userTable.lastName, pattern)
            )
          })
        )
      )
      .limit(limit)

    if (doctors.length === 0) return c.json([])

    const doctorIds = doctors.map((d) => d.id)
    const affRows = await db
      .select({
        doctorId: doctorAffiliation.doctorId,
        institutionId: doctorAffiliation.institutionId,
        institutionName: institution.name,
        practiceName: doctorAffiliation.practiceName,
        createdAt: doctorAffiliation.createdAt,
      })
      .from(doctorAffiliation)
      .leftJoin(
        institution,
        eq(doctorAffiliation.institutionId, institution.id)
      )
      .where(inArray(doctorAffiliation.doctorId, doctorIds))
      .orderBy(doctorAffiliation.createdAt)

    const institutionIds = [
      ...new Set(
        affRows
          .map((r) => r.institutionId)
          .filter((id): id is string => id !== null)
      ),
    ]
    const departmentIdsByInstitution = await resolveInstitutionDepartmentIds(
      db,
      institutionIds
    )

    type AffEntry = z.infer<typeof searchDoctorAffiliationSchema>
    const affsByDoctor = new Map<
      string,
      { institutions: AffEntry[]; practices: AffEntry[] }
    >()
    for (const row of affRows) {
      const bucket = affsByDoctor.get(row.doctorId) ?? {
        institutions: [],
        practices: [],
      }
      if (row.institutionId) {
        bucket.institutions.push({
          type: "institution",
          institutionId: row.institutionId,
          departmentId:
            departmentIdsByInstitution.get(row.institutionId) ?? null,
          displayName: row.institutionName ?? "",
        })
      } else if (row.practiceName) {
        bucket.practices.push({
          type: "practice",
          institutionId: null,
          departmentId: null,
          displayName: row.practiceName,
        })
      }
      affsByDoctor.set(row.doctorId, bucket)
    }

    const results = doctors.map((d) => {
      const bucket = affsByDoctor.get(d.id)
      return {
        id: d.id,
        name: `Dr. ${d.firstName ?? ""} ${d.lastName ?? ""}`.trim(),
        registrationNumber: d.registrationNumber ?? "",
        affiliations: bucket
          ? [...bucket.institutions, ...bucket.practices]
          : [],
      }
    })

    return c.json(results)
  })
}
