import { HttpError, jsonError, jsonOk, requireVerifiedMutationUser } from "@/lib/http";
import { MEDIA_MAX_BYTES } from "@/lib/media";
import { uploadOrganizerBanner } from "@/lib/services/organizer-events";

export const runtime = "nodejs";

/** multipart/form-data: `file`, one image for an event banner. Returns its /media path for the event form. */
export async function POST(request: Request) {
  try {
    const user = await requireVerifiedMutationUser(request, "organizer-media", 20);
    // Refuse oversized bodies before buffering them; the form overhead is small.
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MEDIA_MAX_BYTES + 64 * 1024) throw new HttpError(413, "MEDIA_TOO_LARGE", "Images must be 5 MB or smaller");
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new HttpError(415, "INVALID_INPUT", "Send the image as multipart form data");
    let form: FormData;
    try { form = await request.formData(); } catch { throw new HttpError(400, "INVALID_INPUT", "The upload could not be read"); }
    return jsonOk({ media: await uploadOrganizerBanner(user, form.get("file")) }, 201);
  } catch (error) { return jsonError(error, "The banner could not be uploaded"); }
}
