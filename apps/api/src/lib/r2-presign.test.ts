import { describe, expect, it } from "vite-plus/test"
import {
  createR2Presigner,
  presignGet,
  presignPut,
  type R2Credentials,
} from "./r2-presign"

const CREDS: R2Credentials = {
  accountId: "test-account",
  accessKeyId: "AKIATESTKEY",
  secretAccessKey: "supersecretvalue",
  bucket: "test-bucket",
}

describe("presignGet", () => {
  it("preserves slashes in the object key path", async () => {
    const url = await presignGet(CREDS, "avatars/user-123/abc.webp", 3600)
    const parsed = new URL(url)
    expect(parsed.pathname).toBe("/test-bucket/avatars/user-123/abc.webp")
    expect(parsed.pathname).not.toContain("%2F")
  })

  it("targets the account-scoped R2 endpoint", async () => {
    const url = await presignGet(CREDS, "avatars/x.webp", 60)
    expect(url).toContain("test-account.r2.cloudflarestorage.com")
  })

  it("includes SigV4 query parameters and requested expiry", async () => {
    const url = await presignGet(CREDS, "avatars/x.webp", 900)
    const parsed = new URL(url)
    expect(parsed.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256")
    expect(parsed.searchParams.get("X-Amz-Expires")).toBe("900")
    expect(parsed.searchParams.get("X-Amz-Signature")).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe("createR2Presigner", () => {
  const env = {
    R2_ACCOUNT_ID: "test-account",
    R2_ACCESS_KEY_ID: "AKIATESTKEY",
    R2_SECRET_ACCESS_KEY: "supersecretvalue",
    R2_AVATARS_PUBLIC_BUCKET: "test-bucket",
  } as unknown as CloudflareBindings

  it("throws if any R2 credential env var is missing", () => {
    const incomplete = {
      R2_ACCOUNT_ID: "test-account",
      R2_AVATARS_PUBLIC_BUCKET: "test-bucket",
    } as unknown as CloudflareBindings
    expect(() => createR2Presigner(incomplete)).toThrow(/R2 credentials/)
  })

  it("presigns GET URLs with preserved slashes and SigV4 params", async () => {
    const presigner = createR2Presigner(env)
    const url = await presigner.presignGet("avatars/user/1.webp", 900)
    const parsed = new URL(url)
    expect(parsed.pathname).toBe("/test-bucket/avatars/user/1.webp")
    expect(parsed.searchParams.get("X-Amz-Expires")).toBe("900")
  })

  it("presigns PUT URLs with SigV4 query params (host-only signing)", async () => {
    const presigner = createR2Presigner(env)
    const url = await presigner.presignPut(
      "avatars/user/1.webp",
      "image/webp",
      300
    )
    const parsed = new URL(url)
    expect(parsed.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256")
    // With signQuery only the host header is signed, so content-type is not
    // enforced by the URL itself. avatar.ts re-validates content-type via a
    // HEAD request on /me/avatar/confirm.
    expect(parsed.searchParams.get("X-Amz-SignedHeaders")).toBe("host")
  })

  it("reuses the same signer across many calls without throwing", async () => {
    const presigner = createR2Presigner(env)
    const keys = Array.from({ length: 20 }, (_, i) => `avatars/u${i}/x.webp`)
    const urls = await Promise.all(keys.map((k) => presigner.presignGet(k, 60)))
    expect(urls).toHaveLength(20)
    for (const url of urls) {
      expect(new URL(url).pathname).toContain("/test-bucket/avatars/")
    }
  })
})

describe("presignPut", () => {
  it("preserves slashes in the object key path", async () => {
    const url = await presignPut(
      CREDS,
      "avatars/user-9/y.webp",
      "image/webp",
      300
    )
    const parsed = new URL(url)
    expect(parsed.pathname).toBe("/test-bucket/avatars/user-9/y.webp")
    expect(parsed.pathname).not.toContain("%2F")
  })
})
