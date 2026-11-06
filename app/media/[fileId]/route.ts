import { readPublicMedia } from "@/lib/admin/media";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60", "Content-Type": "text/plain; charset=utf-8" } });

/** Public listing images uploaded from the admin panel. File IDs are never reused, so responses are immutable. */
export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  let media;
  try { media = await readPublicMedia(fileId); } catch {
    return new Response("Image unavailable", { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", "Retry-After": "30" } });
  }
  if (!media) return notFound();
  return new Response(media.bytes, { headers: {
    "Content-Type": media.type,
    "Content-Length": String(media.bytes.byteLength),
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": "inline",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cross-Origin-Resource-Policy": "same-origin",
  } });
}
