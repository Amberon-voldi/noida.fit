import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";

// Anonymous, read-only production requests; no auth records or response bodies are logged.
// Start `npm run start -- --hostname 127.0.0.1 --port 3123`, then run:
// node scripts/benchmark-pages.mjs > /tmp/pages-benchmark.json
const base = process.env.E2E_BASE_URL || "http://127.0.0.1:3123";
const paths = ["/", "/discover?q=running", "/events?date=week", "/places"];
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
async function measure(path) {
  const start = performance.now();
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15_000), headers: { "user-agent": "noidafit-performance-check" } });
  const headersMs = performance.now() - start;
  const body = await response.text();
  const totalMs = performance.now() - start;
  if (response.status !== 200 || !/<h1[ >]/.test(body) || body.includes('NEXT_HTTP_ERROR_FALLBACK')) throw new Error(`Page workload failed: ${path}`);
  return { headersMs, totalMs, bytes: Buffer.byteLength(body) };
}
const results = Object.fromEntries(paths.map(path => [path, []]));
for (const path of paths) await measure(path);
for (let i = 0; i < 9; i++) for (const path of paths) results[path].push(await measure(path));
console.log(JSON.stringify({ revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), runtime: process.version, base, warmups: 1, results: Object.entries(results).map(([path, samples]) => ({ path, samples, medianHeadersMs: median(samples.map(s => s.headersMs)), medianTotalMs: median(samples.map(s => s.totalMs)) })) }, null, 2));
