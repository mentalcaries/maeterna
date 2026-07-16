import { sql } from "drizzle-orm"
import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

// ── Better Auth core tables ──────────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  // Domain fields — stored directly on the user table for easy session reads
  role: text("role", { enum: ["patient", "doctor", "admin"] }),
  status: text("status", {
    enum: ["active", "suspended"],
  })
    .notNull()
    .default("active"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  termsAcceptedAt: integer("terms_accepted_at", { mode: "timestamp" }),
})

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
})

// ── Domain tables ────────────────────────────────────────────────────────────

export const patientProfile = sqliteTable("patient_profile", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  dateOfBirth: text("date_of_birth").notNull(), // YYYY-MM-DD
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const doctorProfile = sqliteTable("doctor_profile", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  registrationNumber: text("registration_number").notNull(),
  phoneNumber: text("phone_number").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const institution = sqliteTable("institution", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["hospital", "health_centre", "private_practice"],
  }).notNull(),
})

export const department = sqliteTable("department", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id")
    .notNull()
    .references(() => institution.id),
  name: text("name").notNull(),
})

export const doctorAffiliation = sqliteTable(
  "doctor_affiliation",
  {
    id: text("id").primaryKey(),
    doctorId: text("doctor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    institutionId: text("institution_id").references(() => institution.id),
    departmentId: text("department_id").references(() => department.id),
    practiceName: text("practice_name"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    uniqueIndex("doctor_affiliation_institution_unique_idx")
      .on(t.doctorId, t.institutionId)
      .where(sql`${t.institutionId} is not null`),
  ]
)

export const reading = sqliteTable("reading", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  loggedById: text("logged_by_id")
    .notNull()
    .references(() => user.id),
  type: text("type", { enum: ["glucose", "blood_pressure"] }).notNull(),
  value1: real("value1").notNull(),
  value2: real("value2"),
  unit: text("unit").notNull(),
  context: text("context", {
    enum: ["fasted", "post_meal", "morning", "evening"],
  }).notNull(),
  notes: text("notes"),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

export const threshold = sqliteTable("threshold", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  doctorId: text("doctor_id")
    .notNull()
    .references(() => user.id), // last updated by — attribution only
  fastingGlucoseHigh: real("fasting_glucose_high").notNull(),
  postMealGlucoseHigh: real("post_meal_glucose_high").notNull(),
  systolicHigh: real("systolic_high").notNull(),
  diastolicHigh: real("diastolic_high").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const accessGrant = sqliteTable("access_grant", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  grantType: text("grant_type", {
    enum: ["individual", "department"],
  }).notNull(),
  granteeId: text("grantee_id").notNull(), // doctor userId (individual) or department.id (department)
  grantedAt: integer("granted_at", { mode: "timestamp" }).notNull(),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
})

export const accessLog = sqliteTable("access_log", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  doctorId: text("doctor_id")
    .notNull()
    .references(() => user.id),
  accessedAt: integer("accessed_at", { mode: "timestamp" }).notNull(),
})

export const invite = sqliteTable("invite", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  doctorId: text("doctor_id")
    .notNull()
    .references(() => user.id),
  departmentId: text("department_id")
    .notNull()
    .references(() => department.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

export const adminInvite = sqliteTable("admin_invite", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role", { enum: ["patient", "doctor"] }).notNull(),
  name: text("name"),
  sentAt: integer("sent_at", { mode: "timestamp" }).notNull(),
})

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id")
    .notNull()
    .references(() => user.id),
  action: text("action").notNull(),
  targetId: text("target_id"),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
})

export const passkey = sqliteTable("passkey", {
  id: text("id").primaryKey(),
  name: text("name"),
  publicKey: text("public_key").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  credentialID: text("credential_id").notNull(),
  counter: integer("counter").notNull(),
  deviceType: text("device_type").notNull(),
  backedUp: integer("backed_up", { mode: "boolean" }).notNull(),
  transports: text("transports"),
  createdAt: integer("created_at", { mode: "timestamp" }),
  aaguid: text("aaguid"),
})

export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  glucoseUnit: text("glucose_unit", { enum: ["mg/dL", "mmol/L"] })
    .notNull()
    .default("mg/dL"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})
