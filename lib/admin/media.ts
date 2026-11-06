import "server-only";

import { ID, Permission, Role, Storage } from "node-appwrite";
import { requireMediaBucketId } from "@/lib/appwrite/config";
import { getAdminClient } from "@/lib/appwrite/server";
import { HttpError } from "@/lib/http";
import { isMediaFileId, MEDIA_MAX_BYTES, MEDIA_TYPES, mediaPath, sniffImageType, type MediaType } from "@/lib/media";
import { runAdminMutation } from "./audit";
import { assertAdmin, type AdminActor } from "./auth";

const PUBLIC_READ = Permission.read(Role.any());
const extensions: Record<MediaType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

function backend(error: unknown): { code: number; type: string } {
  const value = error && typeof error === "object" ? error as { code?: unknown; type?: unknown } : {};
  return { code: typeof value.code === "number" ? value.code : 0, type: typeof value.type === "string" ? value.type : "" };
}

function bucket(): string {
  try { return requireMediaBucketId(); } catch {
    throw new HttpError(503, "MEDIA_NOT_CONFIGURED", "Image uploads are not configured. Set NEXT_PUBLIC_APPWRITE_BUCKET_MEDIA to the Appwrite Storage bucket ID.");
  }
}

/** Store one validated image as publicly readable and return its site path. Audited like other admin writes. */
export async function uploadAdminMedia(user: AdminActor, file: unknown, reason: string): Promise<{ id: string; path: string; type: MediaType; size: number }> {
  assertAdmin(user);
  if (!(file instanceof Blob) || file.size === 0) throw new HttpError(400, "MEDIA_REQUIRED", "Choose an image file to upload");
  if (file.size > MEDIA_MAX_BYTES) throw new HttpError(413, "MEDIA_TOO_LARGE", "Images must be 5 MB or smaller");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) throw new HttpError(415, "MEDIA_TYPE_UNSUPPORTED", "Upload a JPEG, PNG, WebP, GIF or AVIF image");
  const bucketId = bucket();
  const id = ID.unique();
  // The stored name is generated: the operator's file name never reaches storage or logs.
  const upload = new File([bytes], `listing-${id}.${extensions[type]}`, { type });
  await runAdminMutation(user, "media.upload", `media:${id}`, reason, async () => {
    const storage = new Storage(getAdminClient());
    try {
      await storage.createFile({ bucketId, fileId: id, file: upload, permissions: [PUBLIC_READ] });
    } catch (error) {
      const { code, type: kind } = backend(error);
      if (kind === "storage_bucket_not_found") throw new HttpError(503, "MEDIA_NOT_CONFIGURED", `The Appwrite Storage bucket "${bucketId}" was not found`);
      if (kind === "storage_file_type_unsupported") throw new HttpError(415, "MEDIA_TYPE_UNSUPPORTED", "The storage bucket does not allow this image type. Allow it in the bucket settings or upload another format.");
      if (kind === "storage_invalid_file_size") throw new HttpError(413, "MEDIA_TOO_LARGE", "The storage bucket's size limit rejected this image");
      if (code === 401 || kind === "general_unauthorized_scope") throw new HttpError(503, "MEDIA_NOT_CONFIGURED", "The server API key cannot write files. Give it the files.read and files.write scopes.");
      throw new HttpError(503, "MEDIA_UPLOAD_FAILED", "The image could not be uploaded. Try again.");
    }
  });
  return { id, path: mediaPath(id), type, size: bytes.length };
}

/**
 * Bytes for /media/<id>. Only files that were uploaded as public listing images are
 * served: publicly readable and actually an allowed image. Anything else in the bucket is a 404.
 */
export async function readPublicMedia(id: string): Promise<{ bytes: ArrayBuffer; type: MediaType } | null> {
  if (!isMediaFileId(id)) return null;
  const bucketId = requireMediaBucketId();
  const storage = new Storage(getAdminClient());
  try {
    const file = await storage.getFile({ bucketId, fileId: id });
    if (!file.$permissions.includes(PUBLIC_READ) || !(MEDIA_TYPES as readonly string[]).includes(file.mimeType) || file.sizeOriginal > MEDIA_MAX_BYTES) return null;
    const bytes = await storage.getFileView({ bucketId, fileId: id });
    const type = sniffImageType(new Uint8Array(bytes.slice(0, 16)));
    return type ? { bytes, type } : null;
  } catch (error) {
    if (backend(error).code === 404) return null;
    throw error;
  }
}
