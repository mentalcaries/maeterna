import {
  DEFAULT_THRESHOLDS,
  computeSeverity,
  type Thresholds,
  type SeverityType,
} from "@/lib/thresholds"

export type Role = "patient" | "doctor" | "admin"
export type ReadingType = "glucose" | "blood_pressure"
export type ReadingContext = "fasted" | "post_meal" | "morning" | "evening"
export type MealContext = "fasted" | "post_meal"
export type TimeOfDay =
  | "morning"
  | "afternoon"
  | "evening"
  | "before_bed"
  | "at_clinic"
export type AccountStatus = "active" | "suspended"

export interface User {
  id: string
  name: string
  email: string
  role: Role
  status: AccountStatus
  createdAt: string
}

export interface Patient extends User {
  role: "patient"
  doctorId: string
  thresholds?: Partial<Thresholds>
}

export interface Doctor extends User {
  role: "doctor"
  specialty: string
  onboardingComplete?: boolean
  mbttNumber?: string
  mbttVerified?: boolean
  pendingVerification?: boolean
}

export interface Reading {
  id: string
  patientId: string
  loggedById: string
  type: ReadingType
  value1: number
  value2?: number
  unit: string
  context: ReadingContext
  mealContext?: MealContext
  timeOfDay?: TimeOfDay
  notes?: string
  timestamp: string
  severity: SeverityType
}

export interface AuditEntry {
  id: string
  actorId: string
  actorName: string
  action: string
  targetId?: string
  targetName?: string
  timestamp: string
}

export interface AccessGrant {
  id: string
  patientId: string
  grantType: "individual" | "department"
  doctorId?: string
  doctorName?: string
  department?: string
  institutionId?: string
  institutionName?: string
  grantedAt: string
  revokedAt: string | null
}

export interface AccessLog {
  id: string
  patientId: string
  doctorId: string
  doctorName: string
  institution: string
  accessedAt: string
}

export interface Institution {
  id: string
  name: string
  departments: string[]
}

export interface DoctorInstitution {
  id: string
  doctorId: string
  institutionId: string
  institutionName: string
  department: string
}

export interface MBTTEntry {
  number: string
  name: string
}

function daysAgo(days: number, hour = 8, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export const doctors: Doctor[] = [
  {
    id: "doc-1",
    name: "Dr. Marlon Prescod",
    email: "m.prescod@maeterna.app",
    role: "doctor",
    status: "active",
    specialty: "Obstetrics & Gynaecology",
    onboardingComplete: true,
    createdAt: daysAgo(180),
  },
  {
    id: "doc-2",
    name: "Dr. Tanya Deoraj",
    email: "t.deoraj@maeterna.app",
    role: "doctor",
    status: "active",
    specialty: "Maternal-Foetal Medicine",
    onboardingComplete: true,
    createdAt: daysAgo(180),
  },
  {
    id: "doc-3",
    name: "Dr. Cyril Ramlal",
    email: "c.ramlal@maeterna.app",
    role: "doctor",
    status: "active",
    specialty: "General Practice",
    onboardingComplete: false,
    createdAt: daysAgo(2),
  },
]

export const patients: Patient[] = [
  {
    id: "pat-1",
    name: "Kezia Celestine",
    email: "kezia.celestine@example.com",
    role: "patient",
    status: "active",
    doctorId: "doc-1",
    createdAt: daysAgo(90),
  },
  {
    id: "pat-2",
    name: "Adanna Phillip-Joseph",
    email: "adanna.pj@example.com",
    role: "patient",
    status: "active",
    doctorId: "doc-1",
    createdAt: daysAgo(85),
  },
  {
    id: "pat-3",
    name: "Shalini Ramkhelawan",
    email: "shalini.r@example.com",
    role: "patient",
    status: "active",
    doctorId: "doc-2",
    createdAt: daysAgo(75),
  },
  {
    id: "pat-4",
    name: "Chanelle Baptiste",
    email: "chanelle.baptiste@example.com",
    role: "patient",
    status: "active",
    doctorId: "doc-2",
    createdAt: daysAgo(60),
  },
  {
    id: "pat-5",
    name: "Ornella St. Bernard",
    email: "ornella.sb@example.com",
    role: "patient",
    status: "active",
    doctorId: "doc-1",
    createdAt: daysAgo(45),
  },
]

export const adminUsers: User[] = [
  {
    id: "admin-1",
    name: "System Admin",
    email: "admin@maeterna.app",
    role: "admin",
    status: "active",
    createdAt: daysAgo(365),
  },
]

function makeReading(
  id: string,
  patientId: string,
  loggedById: string,
  type: ReadingType,
  value1: number,
  value2: number | undefined,
  context: ReadingContext,
  daysBack: number,
  hour: number,
  notes?: string
): Reading {
  const patient = patients.find((p) => p.id === patientId)
  const thresholds = { ...DEFAULT_THRESHOLDS, ...patient?.thresholds }
  const severity = computeSeverity(type, context, value1, value2, thresholds)
  return {
    id,
    patientId,
    loggedById,
    type,
    value1,
    value2,
    unit: type === "glucose" ? "mmol/L" : "mmHg",
    context,
    notes,
    timestamp: daysAgo(daysBack, hour),
    severity,
  }
}

export const readings: Reading[] = [
  makeReading(
    "r-001",
    "pat-1",
    "pat-1",
    "glucose",
    4.9,
    undefined,
    "fasted",
    88,
    7
  ),
  makeReading(
    "r-002",
    "pat-1",
    "pat-1",
    "glucose",
    8.4,
    undefined,
    "post_meal",
    80,
    13,
    "Had rice and peas"
  ),
  makeReading(
    "r-003",
    "pat-1",
    "doc-1",
    "blood_pressure",
    138,
    88,
    "morning",
    72,
    9,
    "Clinic visit"
  ),
  makeReading(
    "r-004",
    "pat-1",
    "pat-1",
    "glucose",
    7.3,
    undefined,
    "fasted",
    64,
    7
  ),
  makeReading(
    "r-005",
    "pat-1",
    "pat-1",
    "blood_pressure",
    145,
    92,
    "evening",
    56,
    21
  ),
  makeReading(
    "r-006",
    "pat-1",
    "pat-1",
    "glucose",
    11.8,
    undefined,
    "post_meal",
    48,
    14,
    "After birthday cake"
  ),
  makeReading(
    "r-007",
    "pat-1",
    "pat-1",
    "glucose",
    5.1,
    undefined,
    "morning",
    40,
    8
  ),
  makeReading(
    "r-008",
    "pat-1",
    "doc-1",
    "blood_pressure",
    162,
    105,
    "morning",
    30,
    10,
    "Admitted for monitoring"
  ),
  makeReading(
    "r-009",
    "pat-2",
    "pat-2",
    "glucose",
    5.5,
    undefined,
    "fasted",
    85,
    6
  ),
  makeReading(
    "r-010",
    "pat-2",
    "pat-2",
    "glucose",
    7.1,
    undefined,
    "post_meal",
    78,
    12
  ),
  makeReading(
    "r-011",
    "pat-2",
    "pat-2",
    "blood_pressure",
    118,
    76,
    "morning",
    70,
    8
  ),
  makeReading(
    "r-012",
    "pat-2",
    "pat-2",
    "glucose",
    6.0,
    undefined,
    "evening",
    63,
    22
  ),
  makeReading(
    "r-013",
    "pat-2",
    "doc-1",
    "blood_pressure",
    142,
    91,
    "morning",
    55,
    9,
    "Clinic check"
  ),
  makeReading(
    "r-014",
    "pat-2",
    "pat-2",
    "glucose",
    9.2,
    undefined,
    "post_meal",
    47,
    13
  ),
  makeReading(
    "r-015",
    "pat-2",
    "pat-2",
    "blood_pressure",
    122,
    80,
    "evening",
    35,
    21
  ),
  makeReading(
    "r-016",
    "pat-2",
    "pat-2",
    "glucose",
    4.8,
    undefined,
    "fasted",
    20,
    7
  ),
  makeReading(
    "r-017",
    "pat-3",
    "pat-3",
    "blood_pressure",
    130,
    84,
    "morning",
    83,
    7
  ),
  makeReading(
    "r-018",
    "pat-3",
    "pat-3",
    "glucose",
    5.8,
    undefined,
    "fasted",
    76,
    6
  ),
  makeReading(
    "r-019",
    "pat-3",
    "pat-3",
    "glucose",
    8.1,
    undefined,
    "post_meal",
    69,
    12
  ),
  makeReading(
    "r-020",
    "pat-3",
    "doc-2",
    "blood_pressure",
    155,
    98,
    "morning",
    60,
    10,
    "Elevated — prescribed rest"
  ),
  makeReading(
    "r-021",
    "pat-3",
    "pat-3",
    "glucose",
    6.4,
    undefined,
    "evening",
    52,
    22
  ),
  makeReading(
    "r-022",
    "pat-3",
    "pat-3",
    "blood_pressure",
    148,
    93,
    "morning",
    43,
    8
  ),
  makeReading(
    "r-023",
    "pat-3",
    "pat-3",
    "glucose",
    7.9,
    undefined,
    "fasted",
    34,
    7
  ),
  makeReading(
    "r-024",
    "pat-3",
    "doc-2",
    "blood_pressure",
    165,
    112,
    "morning",
    22,
    9,
    "Urgent review"
  ),
  makeReading(
    "r-025",
    "pat-4",
    "pat-4",
    "glucose",
    5.2,
    undefined,
    "fasted",
    58,
    7
  ),
  makeReading(
    "r-026",
    "pat-4",
    "pat-4",
    "glucose",
    7.5,
    undefined,
    "post_meal",
    51,
    13
  ),
  makeReading(
    "r-027",
    "pat-4",
    "pat-4",
    "blood_pressure",
    120,
    78,
    "morning",
    45,
    8
  ),
  makeReading(
    "r-028",
    "pat-4",
    "pat-4",
    "glucose",
    4.7,
    undefined,
    "morning",
    38,
    6
  ),
  makeReading(
    "r-029",
    "pat-4",
    "pat-4",
    "blood_pressure",
    135,
    87,
    "evening",
    28,
    22
  ),
  makeReading(
    "r-030",
    "pat-4",
    "pat-4",
    "glucose",
    6.1,
    undefined,
    "post_meal",
    18,
    14
  ),
  makeReading(
    "r-031",
    "pat-5",
    "pat-5",
    "glucose",
    4.6,
    undefined,
    "fasted",
    44,
    7
  ),
  makeReading(
    "r-032",
    "pat-5",
    "pat-5",
    "blood_pressure",
    128,
    82,
    "morning",
    38,
    9
  ),
  makeReading(
    "r-033",
    "pat-5",
    "pat-5",
    "glucose",
    12.2,
    undefined,
    "post_meal",
    32,
    13,
    "Post glucose tolerance test"
  ),
  makeReading(
    "r-034",
    "pat-5",
    "doc-1",
    "blood_pressure",
    158,
    100,
    "morning",
    25,
    10,
    "Clinic — BP high"
  ),
  makeReading(
    "r-035",
    "pat-5",
    "pat-5",
    "glucose",
    5.9,
    undefined,
    "evening",
    18,
    22
  ),
  makeReading(
    "r-036",
    "pat-5",
    "pat-5",
    "glucose",
    8.7,
    undefined,
    "post_meal",
    10,
    12
  ),
  makeReading(
    "r-037",
    "pat-5",
    "pat-5",
    "blood_pressure",
    144,
    94,
    "morning",
    5,
    8
  ),
]

export const auditLog: AuditEntry[] = [
  {
    id: "a-001",
    actorId: "admin-1",
    actorName: "System Admin",
    action: "Invited patient",
    targetId: "pat-1",
    targetName: "Kezia Celestine",
    timestamp: daysAgo(90),
  },
  {
    id: "a-002",
    actorId: "admin-1",
    actorName: "System Admin",
    action: "Invited patient",
    targetId: "pat-2",
    targetName: "Adanna Phillip-Joseph",
    timestamp: daysAgo(85),
  },
  {
    id: "a-003",
    actorId: "admin-1",
    actorName: "System Admin",
    action: "Invited doctor",
    targetId: "doc-1",
    targetName: "Dr. Marlon Prescod",
    timestamp: daysAgo(180),
  },
  {
    id: "a-004",
    actorId: "admin-1",
    actorName: "System Admin",
    action: "Assigned patient to doctor",
    targetId: "pat-3",
    targetName: "Shalini Ramkhelawan → Dr. Tanya Deoraj",
    timestamp: daysAgo(75),
  },
  {
    id: "a-005",
    actorId: "admin-1",
    actorName: "System Admin",
    action: "Invited patient",
    targetId: "pat-5",
    targetName: "Ornella St. Bernard",
    timestamp: daysAgo(45),
  },
]

export const institutions: Institution[] = [
  {
    id: "inst-1",
    name: "Port of Spain General Hospital",
    departments: ["Obstetrics & Gynaecology"],
  },
  {
    id: "inst-2",
    name: "San Fernando General Hospital",
    departments: ["Obstetrics & Gynaecology"],
  },
  {
    id: "inst-3",
    name: "Mt Hope Women's Hospital",
    departments: ["Obstetrics & Gynaecology", "General Practice"],
  },
  {
    id: "inst-4",
    name: "Eric Williams Medical Sciences Complex",
    departments: ["Obstetrics & Gynaecology"],
  },
  {
    id: "inst-5",
    name: "Caura Hospital",
    departments: ["General Practice"],
  },
  {
    id: "inst-6",
    name: "Prescod Medical Centre",
    departments: ["General Practice"],
  },
  {
    id: "inst-7",
    name: "Deoraj Medical Centre",
    departments: ["General Practice"],
  },
]

export const doctorInstitutions: DoctorInstitution[] = [
  {
    id: "di-1",
    doctorId: "doc-1",
    institutionId: "inst-1",
    institutionName: "Port of Spain General Hospital",
    department: "Obstetrics & Gynaecology",
  },
  {
    id: "di-2",
    doctorId: "doc-2",
    institutionId: "inst-3",
    institutionName: "Mt Hope Women's Hospital",
    department: "Obstetrics & Gynaecology",
  },
]

export const mbttRegistry: MBTTEntry[] = [
  { number: "MBTT-2847", name: "Dr. Marlon Prescod" },
  { number: "MBTT-1653", name: "Dr. Tanya Deoraj" },
  { number: "MBTT-0391", name: "Dr. Cyril Ramlal" },
  { number: "MBTT-4502", name: "Dr. Priya Mohammed" },
]

export const accessGrants: AccessGrant[] = []

export const accessLogs: AccessLog[] = [
  {
    id: "al-001",
    patientId: "pat-1",
    doctorId: "doc-1",
    doctorName: "Dr. Marlon Prescod",
    institution: "Port of Spain General Hospital",
    accessedAt: daysAgo(5, 10, 15),
  },
  {
    id: "al-002",
    patientId: "pat-1",
    doctorId: "doc-1",
    doctorName: "Dr. Marlon Prescod",
    institution: "Port of Spain General Hospital",
    accessedAt: daysAgo(2, 14, 30),
  },
  {
    id: "al-003",
    patientId: "pat-2",
    doctorId: "doc-1",
    doctorName: "Dr. Marlon Prescod",
    institution: "Port of Spain General Hospital",
    accessedAt: daysAgo(3, 9, 0),
  },
  {
    id: "al-004",
    patientId: "pat-3",
    doctorId: "doc-2",
    doctorName: "Dr. Tanya Deoraj",
    institution: "Mt Hope Women's Hospital",
    accessedAt: daysAgo(1, 11, 45),
  },
]

let _nextReadingIndex = readings.length + 1
let _nextAuditIndex = auditLog.length + 1
let _nextGrantIndex = 1
let _nextAccessLogIndex = accessLogs.length + 1
let _nextDoctorInstIndex = doctorInstitutions.length + 1

export function addReading(input: Omit<Reading, "id" | "severity">): Reading {
  const patient = patients.find((p) => p.id === input.patientId)
  const thresholds = { ...DEFAULT_THRESHOLDS, ...patient?.thresholds }
  const severity = computeSeverity(
    input.type,
    input.context,
    input.value1,
    input.value2,
    thresholds
  )
  const reading: Reading = {
    ...input,
    id: `r-${String(_nextReadingIndex++).padStart(3, "0")}`,
    severity,
  }
  readings.push(reading)
  return reading
}

export function addNote(readingId: string, note: string): boolean {
  const reading = readings.find((r) => r.id === readingId)
  if (!reading) return false
  reading.notes = note
  return true
}

export function setPatientThresholds(
  patientId: string,
  thresholds: Partial<Thresholds>
): boolean {
  const patient = patients.find((p) => p.id === patientId)
  if (!patient) return false
  patient.thresholds = { ...patient.thresholds, ...thresholds }
  readings
    .filter((r) => r.patientId === patientId)
    .forEach((r) => {
      const effective = { ...DEFAULT_THRESHOLDS, ...patient.thresholds }
      r.severity = computeSeverity(
        r.type,
        r.context,
        r.value1,
        r.value2,
        effective
      )
    })
  return true
}

export function addAuditEntry(entry: Omit<AuditEntry, "id">): AuditEntry {
  const newEntry: AuditEntry = {
    ...entry,
    id: `a-${String(_nextAuditIndex++).padStart(3, "0")}`,
  }
  auditLog.push(newEntry)
  return newEntry
}

export function inviteUser(
  role: "patient" | "doctor",
  name: string,
  email: string,
  doctorId?: string
): Patient | Doctor {
  const now = new Date().toISOString()
  if (role === "patient") {
    const patient: Patient = {
      id: `pat-${patients.length + 1}`,
      name,
      email,
      role: "patient",
      status: "active",
      doctorId: doctorId ?? "doc-1",
      createdAt: now,
    }
    patients.push(patient)
    return patient
  } else {
    const doctor: Doctor = {
      id: `doc-${doctors.length + 1}`,
      name,
      email,
      role: "doctor",
      status: "active",
      specialty: "General Obstetrics",
      onboardingComplete: false,
      createdAt: now,
    }
    doctors.push(doctor)
    return doctor
  }
}

export function setAccountStatus(
  userId: string,
  status: AccountStatus
): boolean {
  const all: User[] = [...patients, ...doctors, ...adminUsers]
  const user = all.find((u) => u.id === userId)
  if (!user) return false
  user.status = status
  return true
}

export function reassignPatient(
  patientId: string,
  newDoctorId: string
): boolean {
  const patient = patients.find((p) => p.id === patientId)
  if (!patient) return false
  patient.doctorId = newDoctorId
  return true
}

export function getPatientReadings(patientId: string): Reading[] {
  return readings
    .filter((r) => r.patientId === patientId)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
}

export function addAccessGrant(input: Omit<AccessGrant, "id">): AccessGrant {
  const grant: AccessGrant = {
    ...input,
    id: `ag-${String(_nextGrantIndex++).padStart(3, "0")}`,
  }
  accessGrants.push(grant)
  return grant
}

export function revokeAccessGrant(grantId: string): boolean {
  const grant = accessGrants.find((g) => g.id === grantId)
  if (!grant) return false
  grant.revokedAt = new Date().toISOString()
  return true
}

export function getPatientAccessGrants(patientId: string): AccessGrant[] {
  return accessGrants.filter(
    (g) => g.patientId === patientId && g.revokedAt === null
  )
}

export function addAccessLog(entry: Omit<AccessLog, "id">): AccessLog {
  const log: AccessLog = {
    ...entry,
    id: `al-${String(_nextAccessLogIndex++).padStart(3, "0")}`,
  }
  accessLogs.push(log)
  return log
}

export function getPatientAccessLogs(patientId: string): AccessLog[] {
  return accessLogs
    .filter((l) => l.patientId === patientId)
    .sort(
      (a, b) =>
        new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime()
    )
}

export function deletePatientAccount(patientId: string): void {
  const idx = patients.findIndex((p) => p.id === patientId)
  if (idx !== -1) patients.splice(idx, 1)

  for (let i = readings.length - 1; i >= 0; i--) {
    if (readings[i]!.patientId === patientId) readings.splice(i, 1)
  }
  for (let i = accessGrants.length - 1; i >= 0; i--) {
    if (accessGrants[i]!.patientId === patientId) accessGrants.splice(i, 1)
  }
  for (let i = accessLogs.length - 1; i >= 0; i--) {
    if (accessLogs[i]!.patientId === patientId) accessLogs.splice(i, 1)
  }
}

export function getDoctorInstitutions(doctorId: string): DoctorInstitution[] {
  return doctorInstitutions.filter((di) => di.doctorId === doctorId)
}

export function verifyMBTT(number: string): MBTTEntry | null {
  return mbttRegistry.find((e) => e.number === number) ?? null
}

export function setDoctorPending(doctorId: string, mbttNumber: string): void {
  const doctor = doctors.find((d) => d.id === doctorId)
  if (!doctor) return
  doctor.mbttNumber = mbttNumber
  doctor.pendingVerification = true
  doctor.mbttVerified = false
}

export function completeDoctorOnboarding(
  doctorId: string,
  affiliations: {
    institutionId: string
    institutionName: string
    department: string
  }[]
): void {
  const doctor = doctors.find((d) => d.id === doctorId)
  if (!doctor) return
  doctor.mbttVerified = true
  doctor.onboardingComplete = true
  affiliations.forEach((a) => {
    doctorInstitutions.push({
      id: `di-${String(_nextDoctorInstIndex++).padStart(3, "0")}`,
      doctorId,
      institutionId: a.institutionId,
      institutionName: a.institutionName,
      department: a.department,
    })
  })
}
