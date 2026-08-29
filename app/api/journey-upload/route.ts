import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3BucketName, getS3Client } from "@/lib/aws/s3";

// Upload endpoint for the public "My Visa Journey" lead-magnet page
// (app/[locale]/(main)/journey). Unlike the dashboard's Document Vault
// (uploadVisaDocument in app/[locale]/(main)/dashboard/actions.ts), this
// page has no signed-in user or VisaJourney/VisaDocument DB row to attach
// to -- journey progress lives entirely in the visitor's localStorage -- so
// uploads are intentionally unauthenticated here, gated only by file
// size/type. Objects land in the same private R2 bucket under a
// "journey-uploads/" prefix; since the bucket has no public read access,
// GET below mints a fresh short-lived pre-signed URL on every request
// rather than storing a permanent one, so the `url` saved to localStorage
// (a stable "/api/journey-upload?key=..." link) keeps working indefinitely.

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB, matching the dashboard Document Vault limit
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const PRESIGNED_TTL_SECONDS = 15 * 60;
const KEY_PREFIX = "journey-uploads/";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file selected." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File is too large (max 10MB)." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF, JPG, PNG, or WEBP." },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "document";
    const key = `${KEY_PREFIX}${randomUUID()}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await getS3Client().send(
      new PutObjectCommand({ Bucket: getS3BucketName(), Key: key, Body: buffer, ContentType: file.type })
    );

    return NextResponse.json({ name: file.name, url: `/api/journey-upload?key=${encodeURIComponent(key)}` });
  } catch (error) {
    console.error("[journey-upload POST] Upload failed:", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || !key.startsWith(KEY_PREFIX)) {
    return NextResponse.json({ error: "Invalid file reference." }, { status: 400 });
  }

  try {
    const command = new GetObjectCommand({ Bucket: getS3BucketName(), Key: key });
    const url = await getSignedUrl(getS3Client(), command, { expiresIn: PRESIGNED_TTL_SECONDS });
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[journey-upload GET] Failed to generate pre-signed URL:", error);
    return NextResponse.json({ error: "Could not open this file. Please try again." }, { status: 500 });
  }
}
