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
