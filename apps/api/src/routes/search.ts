import { createRoute, z } from "@hono/zod-openapi"
import { eq, like, or, and, inArray } from "drizzle-orm"
import { createDb } from "../db"
import {
  user as userTable,
  doctorProfile,
  doctorAffiliation,
  institution,
  department,
} from "../db/schema"
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
      q: z.string().min(2),
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
    const pattern = `%${q}%`

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
          or(
            like(userTable.firstName, pattern),
            like(userTable.lastName, pattern)
          )
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

    // Batch-fetch departments for every institution referenced, so we can
    // derive an O&G department per institution without an N+1 query.
    const institutionIds = [
      ...new Set(
        affRows
          .map((r) => r.institutionId)
          .filter((id): id is string => id !== null)
      ),
    ]
    const deptRows =
      institutionIds.length > 0
        ? await db
            .select({
              id: department.id,
              institutionId: department.institutionId,
              name: department.name,
            })
            .from(department)
            .where(inArray(department.institutionId, institutionIds))
        : []
    const deptsByInstitution = new Map<string, { id: string; name: string }[]>()
    for (const d of deptRows) {
      const list = deptsByInstitution.get(d.institutionId) ?? []
      list.push({ id: d.id, name: d.name })
      deptsByInstitution.set(d.institutionId, list)
    }
    function deriveDepartmentId(institutionId: string): string | null {
      const depts = deptsByInstitution.get(institutionId)
      if (!depts || depts.length === 0) return null
      const og = depts.find((d) => d.name.toLowerCase().includes("obstetric"))
      return (og ?? depts[0]).id
    }

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
          departmentId: deriveDepartmentId(row.institutionId),
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
