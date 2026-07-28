import { AwsClient } from "aws4fetch"

// R2 exposes an S3-compatible endpoint per account. The R2 binding itself has
// no `.getSignedUrl()` today, so presigning goes through the S3 API.
// Docs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/

export type R2Credentials = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

function getEndpoint(creds: R2Credentials, key: string): string {
  return `https://${creds.accountId}.r2.cloudflarestorage.com/${creds.bucket}/${encodeURIComponent(key)}`
}

function getClient(creds: R2Credentials): AwsClient {
  return new AwsClient({
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    service: "s3",
    region: "auto",
  })
}

export async function presignPut(
  creds: R2Credentials,
  key: string,
  contentType: string,
  expiresInSeconds: number
): Promise<string> {
  const client = getClient(creds)
  const url = new URL(getEndpoint(creds, key))
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds))

  const signed = await client.sign(
    new Request(url.toString(), {
      method: "PUT",
      headers: { "content-type": contentType },
    }),
    { aws: { signQuery: true } }
  )

  return signed.url
}

export async function presignGet(
  creds: R2Credentials,
  key: string,
  expiresInSeconds: number
): Promise<string> {
  const client = getClient(creds)
  const url = new URL(getEndpoint(creds, key))
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds))

  const signed = await client.sign(
    new Request(url.toString(), { method: "GET" }),
    { aws: { signQuery: true } }
  )

  return signed.url
}

// Reads the three R2 credential env vars set via `wrangler secret put` (or
// `.dev.vars` locally). Throws if any are missing so misconfiguration surfaces
// on the first avatar request rather than as a silent 500.
export function readR2Creds(
  env: Record<string, string | undefined>,
  bucket: string
): R2Credentials {
  const accountId = env.R2_ACCOUNT_ID
  const accessKeyId = env.R2_ACCESS_KEY_ID
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials missing: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY"
    )
  }
  return { accountId, accessKeyId, secretAccessKey, bucket }
}
