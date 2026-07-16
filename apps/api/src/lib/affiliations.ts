import { eq, inArray } from "drizzle-orm"
import type { DB } from "../db"
import { department, doctorAffiliation } from "../db/schema"

export function mapAffiliation(row: {
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

export async function resolveInstitutionDepartmentIds(
  db: DB,
  institutionIds: string[]
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(institutionIds)]
  if (uniqueIds.length === 0) return new Map()

  const rows = await db
    .select({
      id: department.id,
      institutionId: department.institutionId,
      name: department.name,
    })
    .from(department)
    .where(inArray(department.institutionId, uniqueIds))

  const departmentsByInstitution = new Map<
    string,
    { id: string; name: string }[]
  >()
  for (const row of rows) {
    const entries = departmentsByInstitution.get(row.institutionId) ?? []
    entries.push({ id: row.id, name: row.name })
    departmentsByInstitution.set(row.institutionId, entries)
  }

  return new Map(
    [...departmentsByInstitution].map(([institutionId, entries]) => {
      const obstetrics = entries.find((entry) =>
        entry.name.toLowerCase().includes("obstetric")
      )
      return [institutionId, (obstetrics ?? entries[0]).id]
    })
  )
}

export async function getDoctorDepartmentIds(
  db: DB,
  doctorId: string
): Promise<string[]> {
  const affiliations = await db
    .select({
      institutionId: doctorAffiliation.institutionId,
      departmentId: doctorAffiliation.departmentId,
    })
    .from(doctorAffiliation)
    .where(eq(doctorAffiliation.doctorId, doctorId))

  const unresolvedInstitutionIds = affiliations
    .filter((affiliation) => affiliation.departmentId === null)
    .map((affiliation) => affiliation.institutionId)
    .filter((id): id is string => id !== null)
  const resolved = await resolveInstitutionDepartmentIds(
    db,
    unresolvedInstitutionIds
  )

  return [
    ...new Set(
      affiliations
        .map(
          (affiliation) =>
            affiliation.departmentId ??
            (affiliation.institutionId
              ? resolved.get(affiliation.institutionId)
              : undefined)
        )
        .filter((id): id is string => id !== undefined)
    ),
  ]
}
