import { createRoute } from "@hono/zod-openapi"
import { z } from "@hono/zod-openapi"
import { createDb } from "../db"
import { institution, department } from "../db/schema"
import { sessionMiddleware } from "../middleware/session"
import { InstitutionSchema, responses } from "../schemas"
import type { AppRouter } from "../types"

const listInstitutionsRoute = createRoute({
  method: "get",
  path: "/institutions",
  tags: ["Institutions"],
  summary: "List all institutions with their departments",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(InstitutionSchema) } },
      description: "All institutions",
    },
    ...responses,
  },
})

export function registerInstitutionRoutes(app: AppRouter) {
  app.use("/institutions", sessionMiddleware)

  app.openapi(listInstitutionsRoute, async (c) => {
    const db = createDb(c.env.DB)

    const institutions = await db.select().from(institution)
    const departments = await db.select().from(department)

    const deptsByInstitution = departments.reduce<
      Record<string, typeof departments>
    >((acc, d) => {
      ;(acc[d.institutionId] ??= []).push(d)
      return acc
    }, {})

    return c.json(
      institutions.map((inst) => ({
        id: inst.id,
        name: inst.name,
        type: inst.type as "hospital" | "health_centre" | "private_practice",
        departments: (deptsByInstitution[inst.id] ?? []).map((d) => ({
          id: d.id,
          institutionId: d.institutionId,
          name: d.name,
        })),
      }))
    )
  })
}
