// Mirrors the backend's PhoneNumberSchema rule (src/schemas/index.ts in apps/api):
// optional leading +, then 7-15 digits, after stripping spaces/dashes/parens.
export function isValidPhoneNumber(raw: string): boolean {
  const stripped = raw.replace(/[\s\-()]/g, "")
  return /^\+?[0-9]{7,15}$/.test(stripped)
}
