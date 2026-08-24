import { S3Client } from "@aws-sdk/client-s3";

// Private-bucket document storage for the Visa Journey Document Vault
// (VisaDocument.fileKey) -- replaces the earlier Vercel Blob integration,
// which only offered public-access URLs. Passport/ID/skills-assessment
// scans are sensitive PII and must never be reachable by a bare URL; every
// read goes through a short-lived pre-signed GetObject URL instead (see
// getSecureDocumentUrlAction in app/[locale]/(main)/dashboard/actions.ts).
//
// Backed by Cloudflare R2, not Amazon S3 -- R2 exposes an S3-compatible API
// (same PutObjectCommand/GetObjectCommand/pre-signed URL flow), reached
// through an account-scoped endpoint instead of AWS's region endpoints.
// The AWS_* credential env var names are kept as-is since they're R2's own
// S3-compatible API keys, not real AWS keys.

let cachedClient: S3Client | null = null;

/** Lazily constructed, cached S3 client -- mirrors lib/prisma.ts's singleton pattern. */
export function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;

  const region = process.env.AWS_REGION || "auto";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("S3 is not configured -- set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.");
  }
  if (!accountId) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID is missing");
  }

  cachedClient = new S3Client({
    region,
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

export function getS3BucketName(): string {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) throw new Error("AWS_S3_BUCKET_NAME is not configured.");
  return bucket;
}
