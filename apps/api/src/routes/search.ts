import { createRoute, z } from "@hono/zod-openapi"
import { eq, like, or, and } from "drizzle-orm"
import { createDb } from "../db"
import {
  user as userTable,
  doctorAffiliation,
  institution,
  department,
} from "../db/schema"
import { sessionMiddleware } from "../middleware/session"
import { DoctorAffiliationSchema, responses } from "../schemas"
import type { AppRouter } from "../types"

const searchDoctorsRoute = createRoute({
  method: "get",
  path: "/search/doctors",
  tags: ["Doctors"],
  summary: "Search doctors by name or institution",
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
              doctorId: z.string().uuid(),
              doctorName: z.string(),
              affiliations: z.array(DoctorAffiliationSchema),
            })
          ),
        },
      },
      description: "Matching doctors with affiliations",
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

    const doctorsByName = await db
      .select({
        id: userTable.id,
        firstName: userTable.firstName,
        lastName: userTable.lastName,
      })
      .from(userTable)
      .where(
        and(
          eq(userTable.role, "doctor"),
          or(
            like(userTable.firstName, pattern),
            like(userTable.lastName, pattern)
          )
        )
      )
      .limit(limit)

    const doctorsByInstitution = await db
      .select({
        id: userTable.id,
        firstName: userTable.firstName,
        lastName: userTable.lastName,
      })
      .from(userTable)
      .innerJoin(
        doctorAffiliation,
        eq(doctorAffiliation.doctorId, userTable.id)
      )
      .innerJoin(
        institution,
        eq(doctorAffiliation.institutionId, institution.id)
      )
      .where(and(eq(userTable.role, "doctor"), like(institution.name, pattern)))
      .limit(limit)

    // Merge and deduplicate
    const seen = new Set<string>()
    const doctors: {
      id: string
      firstName: string | null
      lastName: string | null
    }[] = []
    for (const d of [...doctorsByName, ...doctorsByInstitution]) {
      if (!seen.has(d.id)) {
        seen.add(d.id)
        doctors.push(d)
      }
    }

    const results = await Promise.all(
      doctors.slice(0, limit).map(async (d) => {
        const affs = await db
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
          .innerJoin(
            department,
            eq(doctorAffiliation.departmentId, department.id)
          )
          .where(eq(doctorAffiliation.doctorId, d.id))

        return {
          doctorId: d.id,
          doctorName: `Dr. ${d.firstName ?? ""} ${d.lastName ?? ""}`.trim(),
          affiliations: affs,
        }
      })
    )

    return c.json(results)
  })
}
