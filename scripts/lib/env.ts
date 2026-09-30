import { existsSync } from "node:fs";

export function loadScriptEnv(): void {
  for (const file of [".env", ".env.local"]) {
    if (existsSync(file)) process.loadEnvFile(file);
  }
}
