/** Shared by the /media routes. */

export interface EdgeCache { match(request: Request): Promise<Response | undefined>; put(request: Request, response: Response): Promise<void> }

/** Cloudflare's edge cache in Workers; absent under `next start`. Never let it break serving. */
export function edgeCache(): EdgeCache | undefined {
  try { return (globalThis as { caches?: { default?: EdgeCache } }).caches?.default; } catch { return undefined; }
}

export const mediaNotFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60", "Content-Type": "text/plain; charset=utf-8" } });
export const mediaUnavailable = () => new Response("Image unavailable", { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", "Retry-After": "30" } });
