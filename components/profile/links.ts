export function getProfileUrl(username: string): string {
  let origin = "https://noida.fit";
  try {
    const configured = new URL(process.env.NEXT_PUBLIC_SITE_URL || origin);
    if (["http:", "https:"].includes(configured.protocol) && !configured.username && !configured.password) origin = configured.origin;
  } catch {
    // A misconfigured public URL must never become a javascript: share target.
  }
  return `${origin}/@${encodeURIComponent(username.replace(/^@/, ""))}`;
}
