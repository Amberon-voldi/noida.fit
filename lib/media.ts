/** Admin-uploaded images in Appwrite Storage, served by the site at /media/<fileId>. Safe for client and server. */

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];
/** For <input accept>. SVG is deliberately excluded: it can carry script. */
export const MEDIA_ACCEPT = MEDIA_TYPES.join(",");

const fileId = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/;
export function isMediaFileId(value: string): boolean { return fileId.test(value); }
export function mediaPath(id: string): string { return `/media/${id}`; }
/** Exactly /media/<Appwrite file ID>: no query, fragment, extra segments or traversal. */
export function isMediaPath(value: string | undefined): boolean {
  return typeof value === "string" && value.startsWith("/media/") && isMediaFileId(value.slice("/media/".length));
}

/** Identify an image by its first bytes, never by the browser-supplied name or type. */
export function sniffImageType(bytes: Uint8Array): MediaType | null {
  const at = (offset: number, ...values: number[]) => values.every((value, index) => bytes[offset + index] === value);
  const ascii = (offset: number, text: string) => at(offset, ...[...text].map(char => char.charCodeAt(0)));
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (ascii(0, "GIF87a") || ascii(0, "GIF89a")) return "image/gif";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (ascii(4, "ftyp") && (ascii(8, "avif") || ascii(8, "avis"))) return "image/avif";
  return null;
}
