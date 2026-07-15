import { z } from "@hono/zod-openapi"

export const RoleSchema = z.enum(["patient", "doctor", "admin"])
export const UserStatusSchema = z.enum(["active", "suspended"])
export const ReadingTypeSchema = z.enum(["glucose", "blood_pressure"])
export const SeveritySchema = z.enum(["normal", "high"])
export const ContextSchema = z.enum([
  "fasted",
  "post_meal",
  "morning",
  "evening",
])
export const GrantTypeSchema = z.enum(["individual", "department"])
export const InstitutionTypeSchema = z.enum([
  "hospital",
  "health_centre",
  "private_practice",
])

export const ErrorSchema = z
  .object({
    code: z.string(),
    message: z.string(),
  })
  .openapi("Error")

export const ThresholdsSchema = z
  .object({
    fastingGlucoseHigh: z.number(),
    postMealGlucoseHigh: z.number(),
    systolicHigh: z.number(),
    diastolicHigh: z.number(),
  })
  .openapi("Thresholds")

// Doctors self-attest their registration number and phone number at signup;
// there's no external registry match, so these only validate shape/length.
export const RegistrationNumberSchema = z.string().trim().min(1).max(50)

export const PhoneNumberSchema = z
  .string()
  .trim()
  .refine(
    (val) => /^\+?[0-9]{7,15}$/.test(val.replace(/[\s\-()]/g, "")),
    "Phone number must be 7-15 digits, optionally prefixed with +"
  )

export const DoctorAffiliationSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(["institution", "practice"]),
    institution: z
      .object({ id: z.string().uuid(), name: z.string() })
      .nullable(),
    department: z
      .object({ id: z.string().uuid(), name: z.string() })
      .nullable(),
    practiceName: z.string().nullable(),
  })
  .openapi("DoctorAffiliation")

export const PatientSchema = z
  .object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    dateOfBirth: z.string(),
    dueDate: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    role: RoleSchema,
    status: UserStatusSchema,
    createdAt: z.string().datetime(),
  })
  .openapi("Patient")

export const DoctorSchema = z
  .object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    registrationNumber: z.string().nullable(),
    phoneNumber: z.string().nullable(),
    role: RoleSchema,
    status: UserStatusSchema,
    affiliations: z.array(DoctorAffiliationSchema),
    createdAt: z.string().datetime(),
  })
  .openapi("Doctor")

export const DepartmentSchema = z
  .object({
    id: z.string().uuid(),
    institutionId: z.string().uuid(),
    name: z.string(),
  })
  .openapi("Department")

export const InstitutionSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    type: InstitutionTypeSchema,
    departments: z.array(DepartmentSchema),
  })
  .openapi("Institution")

export const ReadingSchema = z
  .object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    loggedById: z.string().uuid(),
    type: ReadingTypeSchema,
    value1: z.number(),
    value2: z.number().nullable(),
    unit: z.string(),
    context: ContextSchema,
    notes: z.string().nullable(),
    timestamp: z.string().datetime(),
    severity: SeveritySchema,
    createdAt: z.string().datetime(),
  })
  .openapi("Reading")

export const HospitalSharingOptionSchema = z
  .object({
    institutionId: z.string().uuid(),
    departmentId: z.string().uuid(),
    displayName: z.string(),
    activeDepartmentGrantId: z.string().uuid().nullable(),
    grantedAt: z.string().datetime().nullable(),
  })
  .openapi("HospitalSharingOption")

export const AccessGrantSchema = z
  .object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    grantType: GrantTypeSchema,
    granteeId: z.string().uuid(),
    granteeName: z.string(),
    institutionName: z.string(),
    registrationNumber: z.string().nullable(),
    grantedAt: z.string().datetime(),
    revokedAt: z.string().datetime().nullable(),
    hospitalSharingOptions: z.array(HospitalSharingOptionSchema).optional(),
  })
  .openapi("AccessGrant")

export const AccessLogEntrySchema = z
  .object({
    id: z.string().uuid(),
    doctorId: z.string().uuid(),
    doctorName: z.string(),
    institutionName: z.string(),
    accessedAt: z.string().datetime(),
  })
  .openapi("AccessLogEntry")

export const InviteSchema = z
  .object({
    id: z.string().uuid(),
    token: z.string(),
    doctorId: z.string().uuid(),
    doctorName: z.string(),
    institutionName: z.string(),
    departmentName: z.string(),
    expiresAt: z.string().datetime(),
    createdAt: z.string().datetime(),
  })
  .openapi("Invite")

export const UserPreferencesSchema = z
  .object({
    glucoseUnit: z.enum(["mg/dL", "mmol/L"]),
  })
  .openapi("UserPreferences")

export const AuditLogEntrySchema = z
  .object({
    id: z.string().uuid(),
    actorId: z.string().uuid(),
    actorName: z.string(),
    action: z.string(),
    targetId: z.string().uuid().nullable(),
    targetName: z.string().nullable(),
    timestamp: z.string().datetime(),
  })
  .openapi("AuditLogEntry")

export const responses = {
  401: {
    content: { "application/json": { schema: ErrorSchema } },
    description: "Missing or invalid session token",
  },
  403: {
    content: { "application/json": { schema: ErrorSchema } },
    description: "Authenticated but insufficient permissions",
  },
  404: {
    content: { "application/json": { schema: ErrorSchema } },
    description: "Resource not found",
  },
  422: {
    content: { "application/json": { schema: ErrorSchema } },
    description: "Validation error",
  },
} as const
