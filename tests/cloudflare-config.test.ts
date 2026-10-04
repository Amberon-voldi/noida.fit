import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("Cloudflare uses explicit OpenNext output and no nonexistent self binding", () => {
  assert.equal(config.name, "noida-fit");
  assert.equal(config.main, ".open-next/worker.js");
  assert.equal(config.assets.directory, ".open-next/assets");
  assert.equal(config.assets.binding, "ASSETS");
  assert.ok(config.compatibility_flags.includes("nodejs_compat"));
  assert.deepEqual(config.services ?? [], []);
  assert.equal(config.keep_vars, true);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.ok(Object.keys(config.vars).every(key => key.startsWith("NEXT_PUBLIC_")));
  assert.equal(config.vars.NEXT_PUBLIC_APPWRITE_DATABASE_ID, "noida_fit");
  assert.equal(config.vars.NEXT_PUBLIC_SITE_URL, "https://noida.fit");
});

test("Cloudflare builds once with pinned tools and scans the actual public assets", () => {
  assert.equal(pkg.scripts.build, "next build");
  assert.equal(pkg.scripts["cloudflare:build"], "opennextjs-cloudflare build && npm run security:client -- .open-next/assets");
  assert.equal(pkg.scripts["cloudflare:deploy"], "npm run security:client -- .open-next/assets && opennextjs-cloudflare deploy");
  assert.equal(pkg.devDependencies["@opennextjs/cloudflare"], "1.20.8");
  assert.equal(pkg.devDependencies.wrangler, "4.147.0");
  const ignores = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
  for (const pattern of [".open-next/", ".wrangler/", ".dev.vars*"]) assert.ok(ignores.split("\n").includes(pattern));
});
