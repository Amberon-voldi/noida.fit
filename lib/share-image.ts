import "server-only";

/** The link-preview shape Open Graph and X expect. */
export const SHARE_IMAGE = { width: 1200, height: 630, type: "image/jpeg" } as const;
/** WhatsApp skips preview images much over about 300 KB, so quality steps down until it fits. */
export const SHARE_IMAGE_MAX_BYTES = 300 * 1024;
const BACKDROP = "#0c1015";

/**
 * A listing image re-encoded for link previews: the whole image, never cropped (posters keep their
 * text), centred on a blurred, darkened copy of itself that fills 1200×630. Animated images use their
 * first frame. Null when the image can't be read or sharp isn't installed; callers serve the original.
 */
export async function toShareImage(bytes: ArrayBuffer): Promise<Uint8Array<ArrayBuffer> | null> {
  let sharp: typeof import("sharp").default;
  try { sharp = (await import("sharp")).default; } catch { return null; }
  try {
    const { width, height } = SHARE_IMAGE;
    const source = sharp(Buffer.from(bytes), { limitInputPixels: 40_000_000 }).rotate().flatten({ background: BACKDROP });
    const [backdrop, picture] = await Promise.all([
      source.clone().resize(width, height, { fit: "cover" }).blur(24).modulate({ brightness: 0.55 }).toBuffer(),
      source.clone().resize(width, height, { fit: "inside" }).toBuffer(),
    ]);
    const frame = sharp(backdrop).composite([{ input: picture, gravity: "centre" }]);
    let output = Buffer.alloc(0);
    for (const quality of [82, 72, 62, 50]) {
      output = await frame.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
      if (output.length <= SHARE_IMAGE_MAX_BYTES) break;
    }
    return new Uint8Array(output);
  } catch {
    return null;
  }
}
