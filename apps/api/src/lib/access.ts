import { eq, and, or, isNull, inArray } from "drizzle-orm"
import { accessGrant, doctorAffiliation } from "../db/schema"
import type { DB } from "../db"

export async function doctorHasAccess(
  db: DB,
  doctorId: string,
  patientId: string
): Promise<boolean> {
  const affiliations = await db
    .select({ departmentId: doctorAffiliation.departmentId })
    .from(doctorAffiliation)
    .where(eq(doctorAffiliation.doctorId, doctorId))

  const deptIds = affiliations.map((a) => a.departmentId)
  const individualCond = and(
    eq(accessGrant.grantType, "individual"),
    eq(accessGrant.granteeId, doctorId)
  )!
  const deptCond =
    deptIds.length > 0
      ? and(
          eq(accessGrant.grantType, "department"),
          inArray(accessGrant.granteeId, deptIds)
        )
      : null

  const grants = await db
    .select({ id: accessGrant.id })
    .from(accessGrant)
    .where(
      and(
        eq(accessGrant.patientId, patientId),
        isNull(accessGrant.revokedAt),
        deptCond ? or(individualCond, deptCond) : individualCond
      )
    )
    .limit(1)

  return grants.length > 0
}
