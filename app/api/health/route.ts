/**
 * Liveness check for the AWS load balancer and container health checks. It deliberately does
 * not call Appwrite: a backend hiccup must not make the load balancer cycle healthy containers.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
