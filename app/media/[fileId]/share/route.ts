import { readPublicMedia } from "@/lib/admin/media";
import { edgeCache, mediaNotFound, mediaUnavailable } from "@/lib/media-cache";
import { SHARE_IMAGE, toShareImage } from "@/lib/share-image";

/**
 * An uploaded listing image as a link preview (og:image): 1200×630 JPEG, small enough for WhatsApp.
 * Serves only what /media/<id> serves; if the image can't be converted, the original is sent instead.
 */
export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const cache = edgeCache();
  const key = new Request(new URL(`/media/${encodeURIComponent(fileId)}/share`, request.url).toString());
  const cached = await cache?.match(key).catch(() => undefined);
  if (cached) return cached;
  let media;
  try { media = await readPublicMedia(fileId); } catch { return mediaUnavailable(); }
  if (!media) return mediaNotFound();
  const preview = await toShareImage(media.bytes);
  const body = preview ?? new Uint8Array(media.bytes);
  const response = new Response(body, { headers: {
    "Content-Type": preview ? SHARE_IMAGE.type : media.type,
    "Content-Length": String(body.byteLength),
    "Cache-Control": "public, max-age=86400",
    "Content-Disposition": "inline",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    // Made to be shown inside other sites' link previews.
    "Cross-Origin-Resource-Policy": "cross-origin",
  } });
  if (cache) await cache.put(key, response.clone()).catch(() => undefined);
  return response;
}
