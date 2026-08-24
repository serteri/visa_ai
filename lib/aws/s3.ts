import { S3Client } from "@aws-sdk/client-s3";

// Private-bucket document storage for the Visa Journey Document Vault
// (VisaDocument.fileKey) -- replaces the earlier Vercel Blob integration,
// which only offered public-access URLs. Passport/ID/skills-assessment
// scans are sensitive PII and must never be reachable by a bare URL; every
// read goes through a short-lived pre-signed GetObject URL instead (see
// getSecureDocumentUrlAction in app/[locale]/(main)/dashboard/actions.ts).

let cachedClient: S3Client | null = null;

/** Lazily constructed, cached S3 client -- mirrors lib/prisma.ts's singleton pattern. */
export function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;

  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 is not configured -- set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY."
    );
  }

  cachedClient = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  return cachedClient;
}

export function getS3BucketName(): string {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) throw new Error("AWS_S3_BUCKET_NAME is not configured.");
  return bucket;
}
