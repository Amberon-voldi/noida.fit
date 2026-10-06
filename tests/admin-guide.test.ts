import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { endpointGuide, adminModules } from "../lib/admin/guide";

function routes(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? routes(join(directory, entry.name)) : entry.name === "route.ts" ? [join(directory, entry.name)] : []);
}

test("the operator guide documents every implemented API route and exported method", () => {
  const root = join(process.cwd(), "app");
  for (const file of routes(join(root, "api"))) {
    const path = "/" + relative(root, file).replaceAll("\\", "/").replace(/\/route\.ts$/, "");
    const source = readFileSync(file, "utf8");
    const methods = [...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map(match => match[1]);
    for (const method of methods) {
      assert.ok(endpointGuide.some(([documentedMethods, endpoint]) => endpoint.split("?")[0] === path && documentedMethods.split(/\s*\/\s*/).includes(method)), `${method} ${path} needs a guide entry`);
    }
  }
});

test("all admin navigation modules have an actionable workflow in the guide", () => {
  for (const path of ["/admin", "/admin/content/events", "/admin/content/communities", "/admin/content/activities", "/admin/content/places", "/admin/members", "/admin/attendance", "/admin/audit", "/organizer"]) {
    const entry = adminModules.find(entry => entry.path === path);
    assert.ok(entry, `${path} needs guide coverage`);
    assert.ok(entry.workflow.length > 50);
  }
});
