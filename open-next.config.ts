import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Directory and account routes are live SSR, not ISR. No cache/revalidation
// infrastructure or WORKER_SELF_REFERENCE service binding is needed.
export default defineCloudflareConfig();
