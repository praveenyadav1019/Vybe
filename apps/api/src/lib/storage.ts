import { randomUUID } from "crypto";
import type { Env } from "../env.js";

/**
 * Object storage helper (AWS S3 / Cloudflare R2).
 *
 * Photos are uploaded directly from the mobile client to the bucket using a
 * short-lived presigned PUT URL produced here; the resulting public CDN URL is
 * then persisted via `POST /me/photos`.
 *
 * Mirrors the graceful-fallback pattern used for Twilio/Agora: if credentials
 * are absent the caller should short-circuit (see `isStorageConfigured`).
 */

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export interface PresignedUpload {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

/**
 * Storage is usable when we have a bucket AND some way to sign requests:
 *  - explicit keys (Cloudflare R2, MinIO, or S3 with an IAM user), or
 *  - the ambient AWS credential chain (an EC2 instance role / IRSA), which is
 *    the preferred setup on AWS since it avoids long-lived secrets entirely.
 * `STORAGE_USE_INSTANCE_ROLE=true` opts into the latter.
 */
export function isStorageConfigured(env: Env): boolean {
  if (!env.STORAGE_BUCKET) return false;
  if (env.STORAGE_ACCESS_KEY && env.STORAGE_SECRET_KEY) return true;
  return env.STORAGE_USE_INSTANCE_ROLE === true;
}

function extFor(contentType: string): string {
  const sub = contentType.split("/")[1] ?? "jpg";
  return sub === "jpeg" ? "jpg" : sub;
}

/**
 * Generate a presigned PUT URL (valid 5 min) plus the final CDN URL the file
 * will be reachable at once uploaded.
 */
export async function createPresignedUpload(
  env: Env,
  userId: string,
  contentType: string,
): Promise<PresignedUpload> {
  // Dynamic import keeps the AWS SDK out of the startup path in dev.
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const fileKey = `photos/${userId}/${randomUUID()}.${extFor(contentType)}`;

  const hasExplicitKeys = Boolean(env.STORAGE_ACCESS_KEY && env.STORAGE_SECRET_KEY);

  const client = new S3Client({
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT || undefined,
    // R2 / MinIO require path-style addressing; native S3 does not.
    forcePathStyle: Boolean(env.STORAGE_ENDPOINT),
    // Omitting `credentials` lets the SDK use its default provider chain, which
    // picks up the EC2 instance role from IMDS — no secrets on disk.
    ...(hasExplicitKeys
      ? {
          credentials: {
            accessKeyId: env.STORAGE_ACCESS_KEY!,
            secretAccessKey: env.STORAGE_SECRET_KEY!,
          },
        }
      : {}),
  });

  const command = new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  const publicUrl = `${env.STORAGE_CDN_URL.replace(/\/$/, "")}/${fileKey}`;

  return { uploadUrl, fileKey, publicUrl };
}
