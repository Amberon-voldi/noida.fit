import { renderGiftImage } from "@/lib/gift-image";
import { siteOrigin } from "@/lib/http";
import { getGiftView } from "@/lib/services/gifts";

export const runtime = "nodejs";

/** The gift link's preview image (og:image). Shows nothing about who has claimed it. */
export async function GET(request: Request, { params }: { params: Promise<{ giftId: string }> }) {
  const { giftId } = await params;
  const view = await getGiftView(giftId).catch(() => null);
  if (!view) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60", "Content-Type": "text/plain; charset=utf-8" } });
  const { body, type } = await renderGiftImage(view, siteOrigin(request));
  return new Response(body, { headers: {
    "Content-Type": type,
    "Content-Length": String(body.byteLength),
    "Cache-Control": "public, max-age=3600",
    "Content-Disposition": "inline",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    // Made to be shown inside other sites' link previews.
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Robots-Tag": "noindex",
  } });
}
