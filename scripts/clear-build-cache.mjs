import { rmSync } from "node:fs";

// Remove only generated compiler caches, including Netlify's restored copy.
// These can retain environment values from builds predating the cache opt-out.
for (const directory of [".next/cache/turbopack", ".netlify/.next/cache/turbopack"]) {
  rmSync(directory, { recursive: true, force: true });
}
