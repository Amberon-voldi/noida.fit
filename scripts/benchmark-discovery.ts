import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { activities, communities, events, places } from "../data/seed";
import { filterDirectory, readFilters } from "../components/discovery/filter";
import { formatDate } from "../lib/config";
import type { Directory } from "../lib/data";

// Synthetic, fixed-date workloads; never reads credentials or writes to Appwrite.
// Run: npx tsx scripts/benchmark-discovery.ts > /tmp/discovery-benchmark.json
const now = new Date("2026-09-30T00:00:00+05:30");
const fixedEvents = events.map((event, index) => {
  const date = new Date(Date.UTC(2026, 8, 28 + index)).toISOString().slice(0, 10);
  return { ...event, date, startsAt: `${date}T06:00:00+05:30`, endsAt: `${date}T07:00:00+05:30` };
});
const base: Directory = { activities, communities, events: fixedEvents, places };
function grow(copies: number): Directory {
  return {
    activities,
    events: Array.from({ length: copies }, (_, i) => base.events.map(event => ({ ...event, id: `${event.id}-${i}`, venueSlug: `${event.venueSlug}-${i}` }))).flat(),
    communities: Array.from({ length: copies }, (_, i) => base.communities.map(item => ({ ...item, id: `${item.id}-${i}` }))).flat(),
    places: Array.from({ length: copies }, (_, i) => base.places.map(item => ({ ...item, id: `${item.id}-${i}`, slug: `${item.slug}-${i}` }))).flat(),
  };
}
const cases = [{}, { date: "week" }, { date: "weekend" }, { q: "running near sector 21a" }, { type: "places", activity: "sports" }, { q: "free morning run today" }].map(value => readFilters(value));
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const results = [1, 25].map(copies => {
  const directory = grow(copies);
  const output = () => cases.map(filters => filterDirectory(directory, filters, now));
  const digest = createHash("sha256").update(JSON.stringify(output())).digest("hex");
  const iterations = copies === 1 ? 30 : 3;
  for (let i = 0; i < 5; i++) output();
  const samples = Array.from({ length: 9 }, () => {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) output();
    return (performance.now() - start) / iterations;
  });
  return { events: directory.events.length, places: directory.places.length, cases: cases.length, iterations, digest, samplesMs: samples, medianMs: median(samples) };
});
for (let i = 0; i < 100; i++) formatDate("2026-09-30");
const formatSamples = Array.from({ length: 9 }, () => {
  const start = performance.now();
  for (let i = 0; i < 1000; i++) formatDate("2026-09-30");
  return performance.now() - start;
});
console.log(JSON.stringify({ revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), runtime: process.version, platform: `${process.platform}/${process.arch}`, now: now.toISOString(), results, dateFormatting: { calls: 1000, output: formatDate("2026-09-30"), samplesMs: formatSamples, medianMs: median(formatSamples) } }, null, 2));
