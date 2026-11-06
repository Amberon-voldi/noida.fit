import { z } from "zod";
import { HttpError, jsonError, jsonOk } from "@/lib/http";
import { requireAdminMutationUser } from "@/lib/admin/auth";
import { uploadAdminMedia } from "@/lib/admin/media";
import { MEDIA_MAX_BYTES } from "@/lib/media";

const reason = z.string().trim().min(5).max(300);

/** multipart/form-data: `file` (one image) and `reason` (for the admin audit log). */
export async function POST(request: Request) {
  try {
    const user = await requireAdminMutationUser(request, "admin-media");
    // Refuse oversized bodies before buffering them; the form overhead is small.
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MEDIA_MAX_BYTES + 64 * 1024) throw new HttpError(413, "MEDIA_TOO_LARGE", "Images must be 5 MB or smaller");
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new HttpError(415, "INVALID_INPUT", "Send the image as multipart form data");
    let form: FormData;
    try { form = await request.formData(); } catch { throw new HttpError(400, "INVALID_INPUT", "The upload could not be read"); }
    const parsed = reason.safeParse(form.get("reason"));
    if (!parsed.success) throw new HttpError(400, "AUDIT_REASON_REQUIRED", "Enter a short reason for this upload (5–300 characters)");
    return jsonOk({ media: await uploadAdminMedia(user, form.get("file"), parsed.data) }, 201);
  } catch (error) { return jsonError(error, "The image could not be uploaded"); }
}
