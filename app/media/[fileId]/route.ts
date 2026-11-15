import { readPublicMedia } from "@/lib/admin/media";
import { edgeCache, mediaNotFound, mediaUnavailable } from "@/lib/media-cache";

/**
 * Public listing images uploaded from the admin panel. File IDs are never reused, but a file
 * removed from Storage (e.g. moderation) must stop showing, so browsers and the edge keep it one day.
 */
export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  // Without this, every view of an image costs two Appwrite calls through the Worker.
  const cache = edgeCache();
  const key = new Request(new URL(`/media/${encodeURIComponent(fileId)}`, request.url).toString());
  const cached = await cache?.match(key).catch(() => undefined);
  if (cached) return cached;
  let media;
  try { media = await readPublicMedia(fileId); } catch { return mediaUnavailable(); }
  if (!media) return mediaNotFound();
  const response = new Response(media.bytes, { headers: {
    "Content-Type": media.type,
    "Content-Length": String(media.bytes.byteLength),
    "Cache-Control": "public, max-age=86400",
    "Content-Disposition": "inline",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cross-Origin-Resource-Policy": "same-origin",
  } });
  if (cache) await cache.put(key, response.clone()).catch(() => undefined);
  return response;
}
