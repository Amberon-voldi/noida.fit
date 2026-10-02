import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadScriptEnv } from "./lib/env";
loadScriptEnv();
const secrets = ["APPWRITE_KEY", "APPWRITE_CHECKIN_SECRET", "AUTH_SECRET"]
  .map(name=>process.env[name]).filter((value):value is string=>Boolean(value&&value.length>8));
let scanned=0;
function inspect(directory:string) {
  for(const file of readdirSync(directory,{withFileTypes:true})) {
    const path=join(directory,file.name);
    if(file.isDirectory()){inspect(path);continue;}
    const body=readFileSync(path);
    if(secrets.some(secret=>body.includes(Buffer.from(secret))))throw new Error(`Secret found in public artifact: ${path}`);
    // Fail even when runtime-only secret values are unavailable during CI builds.
    if(["APPWRITE_KEY", "APPWRITE_CHECKIN_SECRET", "x-appwrite-key"].some(marker=>body.includes(Buffer.from(marker))))throw new Error(`Server credential reference found in public artifact: ${path}`);
    scanned++;
  }
}
try {inspect(".next/static");inspect("public");console.log(`PASS browser artifact secret scan: ${scanned} files checked; no secret values printed.`);}
catch(error){console.error(error instanceof Error?error.message:"Secret scan failed");process.exitCode=1;}
