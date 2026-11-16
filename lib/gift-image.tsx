import "server-only";

import { ImageResponse } from "next/og";
import { readPublicMedia } from "@/lib/admin/media";
import { formatDate } from "@/lib/config";
import { isMediaPath } from "@/lib/media";
import { parseEventPrice } from "@/lib/pricing";
import { SHARE_IMAGE, SHARE_IMAGE_MAX_BYTES } from "@/lib/share-image";
import type { GiftView } from "@/lib/services/gifts";

const LIME = "#9ddc2e";
const INK = "#0c1015";
type Sharp = typeof import("sharp").default;

async function loadSharp(): Promise<Sharp | null> {
  try { return (await import("sharp")).default; } catch { return null; }
}

/** The event's banner, darkened and cut to the card, as a data URL. Only uploaded or same-site images. */
async function backdrop(sharp: Sharp, image: string | undefined, origin: string): Promise<string | null> {
  if (!image) return null;
  try {
    let bytes: ArrayBuffer | null = null;
    if (isMediaPath(image)) bytes = (await readPublicMedia(image.slice("/media/".length)))?.bytes ?? null;
    else if (image.startsWith("/") && !image.startsWith("//")) {
      const response = await fetch(new URL(image, origin), { signal: AbortSignal.timeout(4000) });
      if (response.ok) bytes = await response.arrayBuffer();
    }
    if (!bytes) return null;
    const jpeg = await sharp(Buffer.from(bytes), { limitInputPixels: 40_000_000 }).rotate()
      .resize(SHARE_IMAGE.width, SHARE_IMAGE.height, { fit: "cover" }).modulate({ brightness: 0.75 }).jpeg({ quality: 72 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

const clip = (text: string, max: number) => text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

function GiftIcon() {
  return <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={LIME} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
    <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
  </svg>;
}

/**
 * The gift link's preview card (og:image): who it's for, the event, and a ticket stub that says the spot
 * is free, over the event's banner. 1200×630 JPEG within WhatsApp's size limit when sharp is installed;
 * otherwise a plain PNG card without the banner, which stays small.
 */
export async function renderGiftImage(view: GiftView, origin: string): Promise<{ body: Uint8Array<ArrayBuffer>; type: string }> {
  const { event, link } = view;
  const sharp = await loadSharp();
  const photo = sharp ? await backdrop(sharp, event.coverImageUrl ?? event.imageUrl, origin) : null;
  const pricing = parseEventPrice(event.price);
  const title = clip(event.title, 70);
  const when = `${formatDate(event.date)} · ${event.startTime}`;
  const card = <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: INK, color: "#f8fafc" }}>
    {/* eslint-disable-next-line @next/next/no-img-element -- drawn into the image by next/og, never served to a browser */}
    {photo && <img src={photo} width={SHARE_IMAGE.width} height={SHARE_IMAGE.height} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />}
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", backgroundImage: "linear-gradient(90deg, rgba(12,16,21,0.97) 0%, rgba(12,16,21,0.88) 52%, rgba(12,16,21,0.45) 100%)" }} />
    <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "52px 64px" }}>
      <div style={{ display: "flex", fontSize: 30, letterSpacing: 1 }}>NOIDA<span style={{ color: LIME }}>.FIT</span></div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
        <div style={{ display: "flex", alignItems: "center", alignSelf: "flex-start", gap: 14, padding: "10px 22px 10px 16px", borderRadius: 999, border: `2px solid ${LIME}`, background: "rgba(157,220,46,0.14)", color: LIME, fontSize: 26, letterSpacing: 3 }}>
          <GiftIcon />YOU’RE INVITED
        </div>
        {link.label && <div style={{ display: "flex", marginTop: 26, fontSize: 36, color: LIME }}>{clip(`For ${link.label}`, 40)}</div>}
        <div style={{ display: "flex", marginTop: link.label ? 10 : 26, fontSize: title.length > 40 ? 54 : 66, lineHeight: 1.08 }}>{title}</div>
        <div style={{ display: "flex", marginTop: 22, fontSize: 28, color: "#cbd5e1" }}>{clip(`${when} · ${event.venueName}`, 60)}</div>
      </div>
      <div style={{ display: "flex", fontSize: 26, color: "#b3bdca" }}>{clip(`Gifted by ${event.communityName}`, 50)}</div>
    </div>
    <div style={{ position: "absolute", right: 64, bottom: 52, display: "flex", flexDirection: "column", alignItems: "center", width: 260, padding: "26px 20px", borderRadius: 22, border: `3px dashed ${LIME}`, background: "rgba(12,16,21,0.82)" }}>
      {pricing.kind === "paid" && <div style={{ display: "flex", fontSize: 34, color: "#94a3b8", textDecoration: "line-through" }}>{pricing.label}</div>}
      <div style={{ display: "flex", fontSize: 64, color: LIME, letterSpacing: 2 }}>FREE</div>
      <div style={{ display: "flex", marginTop: 4, fontSize: 22, color: "#e2e8f0", letterSpacing: 2 }}>{link.spots > 1 ? `${link.spots} SPOTS` : "YOUR SPOT"}</div>
    </div>
  </div>;
  const png = await new ImageResponse(card, { width: SHARE_IMAGE.width, height: SHARE_IMAGE.height }).arrayBuffer();
  if (sharp) {
    try {
      const frame = sharp(Buffer.from(png));
      let output = Buffer.alloc(0);
      for (const quality of [84, 74, 64, 52]) {
        output = await frame.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
        if (output.length <= SHARE_IMAGE_MAX_BYTES) break;
      }
      return { body: new Uint8Array(output), type: SHARE_IMAGE.type };
    } catch {
      // Fall through to the PNG.
    }
  }
  return { body: new Uint8Array(png), type: "image/png" };
}
