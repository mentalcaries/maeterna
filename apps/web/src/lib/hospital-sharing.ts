import type { components } from "./api.types"

export type HospitalSharingOption =
  components["schemas"]["HospitalSharingOption"]

export function hospitalShareButtonLabel(
  options: HospitalSharingOption[]
): string | null {
  return options.some((option) => option.activeDepartmentGrantId === null)
    ? "Share with entire dept"
    : null
}

export function initialHospitalSelection(
  options: HospitalSharingOption[]
): string | null {
  const option = options.length === 1 ? options[0] : null
  return option?.activeDepartmentGrantId === null ? option.departmentId : null
}

export function formatGrantDate(value: string): string {
  return new Date(value).toLocaleDateString("en-TT", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
