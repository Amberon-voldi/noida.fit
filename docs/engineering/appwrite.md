# Appwrite operations — NOIDA.FIT

This guide describes the implemented backend, superseding earlier seed-only architecture sketches. Appwrite `node-appwrite` SDK 20 is pinned for the existing self-hosted 1.8-compatible server. The observed server reports `1.8.0-RC2`: functional tests pass, but the version warning is a reason to schedule an operator-managed upgrade to a stable supported release.

## Configuration and credential handling

`.env` is the source for `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `NEXT_PUBLIC_APPWRITE_PROJECT_NAME`, `NEXT_PUBLIC_APPWRITE_ENDPOINT`, and server-only `APPWRITE_KEY`. Database and collection IDs are explicit `NEXT_PUBLIC_APPWRITE_DATABASE_ID` / `NEXT_PUBLIC_APPWRITE_COLLECTION_*` variables, with no hardcoded runtime fallbacks. See root `.env.example` for the full list.

`APPWRITE_CHECKIN_SECRET` is a separate random HMAC secret, generated in ignored `.env.local` by setup only when absent. Persist the same value on every application instance; changing it invalidates unexpired check-in codes. It must not be the API key. Set `NEXT_PUBLIC_SITE_URL` to the deployed origin for canonical links, QR codes and mutation origin validation. Leave it unset for local development unless intentionally testing another origin.

Privileged modules are protected with `import "server-only"`. The browser talks to same-origin Next route handlers, not elevated Appwrite APIs. SSR session secrets are in HttpOnly cookies, never JSON responses. Public profile DTOs explicitly exclude account ID, email, raw database metadata, private participation and settings.

Use separate least-privilege keys for setup and runtime where operationally possible:

- Setup: database/collection/attribute/index read and write, document read/write.
- Runtime: document read/write, `users.read` for operator check-in account-status verification, and session creation as required by Appwrite SSR auth (`sessions.write`); **not** schema administration. Authentication still checks the supplied email/password.
- Test runner: users read/write, sessions write, documents read/write for isolated fixtures and cleanup.

Check the scopes supported by the deployed Appwrite version. Do not print full errors, CLI debug output, project/key lists or auth session responses. Those can contain credentials. The local CLI target config is ignored rather than committed with a fixed project ID.

## Netlify deployment

Use Netlify's Next.js runtime (not a static export), build command `npm run build`, publish directory `.next`, and Node 22+. Directory queries call Next.js `connection()` before accessing Appwrite so they run per request, not during prerendering.

Set the variables in `.env.example` in Netlify for the correct deploy context and **Functions/runtime** scope, as well as Builds where needed. Local ignored `.env` files are not deployed. In particular, `APPWRITE_KEY` must be an unexpired server API key from the same Appwrite project with `documents.read`, `documents.write` and `sessions.write` scopes. Never expose it as a `NEXT_PUBLIC_*` variable. Set `NEXT_PUBLIC_SITE_URL` to the actual HTTPS site origin and redeploy after environment changes.

Production Turbopack disk caching is disabled in `next.config.ts` because its `.sst` files can retain build-time environment secrets. `npm run build` first removes stale compiler caches from `.next/cache/turbopack` and `.netlify/.next/cache/turbopack`. After deploying this fix, use Netlify's **clear cache and deploy** option once to discard older remote caches. Keep Netlify secret scanning enabled: do not omit `APPWRITE_KEY` or disable the scan. Prefer **Functions-only** scope for `APPWRITE_KEY` and `APPWRITE_CHECKIN_SECRET`; the Next.js build does not need those secrets. A cache match alone does not prove the key was served publicly; rotate it if exposure cannot be ruled out.

A runtime `401 user_unauthorized` means the project/key/scopes need correction; deferring prerendering does not repair credentials. Do not make private collections public to work around it. The SDK's `1.8.0` versus `1.8.0-RC2` warning is separate from authentication failure.

### Public configuration variable migration

Database/collection IDs now use `NEXT_PUBLIC_APPWRITE_DATABASE_ID` and `NEXT_PUBLIC_APPWRITE_COLLECTION_*`; the proxy flag is `NEXT_PUBLIC_TRUST_PROXY_IP`. Rename these variables in Netlify's Production context and make them available during **Builds**, then rebuild/redeploy: Next.js inlines public variables at build time. The CLI scripts also read the new names from `.env`. There is no fallback to the old names.

`APPWRITE_KEY`, `APPWRITE_CHECKIN_SECRET`, and any `AUTH_SECRET` remain private. Never add `NEXT_PUBLIC_` to authentication/signing secrets. Framework/test-runner variables such as `NODE_ENV` and `E2E_BASE_URL` retain their standard names.

Page data reads log `[Appwrite] Reading collection` with the collection name and configured ID in the server console / Netlify Function logs. They do not log keys, session secrets, queries or row contents.

### Runtime failures after a successful deploy

React error #441 is a redacted Server Component error, not its underlying cause. After deploying the diagnostics, open Netlify **Logs → Functions** for the Next.js server handler (usually `___netlify-server-handler`), request `/events`, and try signing in once. Filter for `[Appwrite]`:

- **Server configuration**: logged once per server instance (and if configuration diagnostics change). Shows endpoint origin, public project/database IDs, missing setting names, API-key presence/whitespace/quote booleans, and signing-secret/site-URL presence. It never prints the key or a key fingerprint. `apiKeyPresent: true` does not mean the key is valid.
- **Reading collection**: shows the configured collection alias and ID; `(unset)` means its public variable was absent at build time.
- **Operation started/completed/failed**: generated `traceId`, operation, collection alias where relevant, and elapsed milliseconds. Login's `auth.session.create`, `auth.session.read`, and `auth.profile.ensure` share a trace ID so a session problem can be distinguished from a profile/database problem. Independent database reads have their own IDs.
- Failures include only numeric status, an allowlisted Appwrite type and, when available, an allowlisted network error code (`ENOTFOUND`, `ETIMEDOUT`, etc.). Passwords, emails, sessions, request bodies, query values, row contents, raw SDK messages and stacks are not sent to these diagnostic logs.

These are **server logs**, not browser DevTools logs or build-only logs. No extra debug environment variable is needed. Existing Next.js error reporting may separately emit its own server error; do not share unredacted credentials from any other logger.

- `general_unauthorized_scope` / `user_unauthorized`: check the server key's project, validity and `documents.read`, `documents.write`, `sessions.write` scopes.
- `project_not_found` / `project_unknown`: check endpoint and project ID match the key.
- `database_not_found` / `collection_not_found`: check IDs and provisioned schema for this environment.
- Status `0` / `unknown`: inspect adjacent server errors for missing environment variables or connectivity failures; redact secrets before sharing logs.

Set every variable for the **Production deploy context** and **Functions runtime**, then redeploy. The build succeeding does not test runtime credentials. Login returns `401 INVALID_CREDENTIALS` only for Appwrite's explicit `user_invalid_credentials`; infrastructure/permission failures return `503 LOGIN_UNAVAILABLE` instead of blaming the password.

## Provision, seed, verify

```sh
npm run appwrite:setup
npm run appwrite:seed       # development/staging only
npm run appwrite:permissions            # preview ACL-only repairs
npm run appwrite:permissions -- --apply # apply public/owner-only policy to existing records
npm run appwrite:verify
```

Setup inspects each configured ID before creating anything. A same-named database/collection under another ID causes an actionable error rather than duplication. Existing schema mismatches fail rather than destructively migrating data. Setup enables document security, removes collection-level grants, waits for attributes **and indexes** to become available, and verifies the resulting ACLs.

Seed uses deterministic IDs, upserting only demo content and refusing to overwrite non-demo records. Unknown IDs remain untouched. **26 activities, 12 fictional communities, 18 places and 24 events** include free/paid, future/past, morning/evening sessions across Noida and Greater Noida. Dates are resolved in Asia/Kolkata at seed time. Re-running seed refreshes demo dates, not production data. It creates no auth users, public credentials or attendance metrics.

`appwrite:permissions` validates record ownership before applying any changes, clears collection-wide grants, enables document security, and reconciles document ACLs without rewriting data. Published listings get `read(any)` (guests and signed-in members); drafts get no public access; private records get owner-only read access. No direct client writes are granted.

`appwrite:verify` checks schema/index readiness, document security, every record's exact ACL, anonymous access to exactly the published public records, and event activity/community/place references. Avoid changing schema permissions manually after provisioning.

## Schema

Appwrite owns `$createdAt` and `$updatedAt`; code strips caller-supplied `$` metadata from mutations. Collection IDs come from the environment, not the labels below.

| Entity | Stored fields / constraints |
| --- | --- |
| Profiles | userId, unique username, displayName, optional avatarUrl/bio, city, unique fitnessId, memberSince, visibility, showActivity, showCommunities, notifications; document ID = auth user ID |
| Fitness IDs | unique userId, unique random publicId, status, memberSince; no user-ID-derived serial |
| Activities | unique slug, name, emoji, status, demo, payload |
| Events | unique slug, title, activityId, communitySlug, venueSlug, sector, date, startsAt, endsAt, capacity, featured, optional organizerUserId, status, demo, payload |
| Places | unique slug, sector, featured, status, demo, payload |
| Communities | unique slug, activityId, status, demo, payload |
| RSVPs | eventId, userId, status, seatNumber, createdAt; unique(eventId,userId), unique(eventId,seatNumber) |
| Check-ins | eventId, userId, timestamp, verificationMethod; unique(eventId,userId) |
| Memberships | userId, communityId, status, createdAt; unique(userId,communityId) |
| Saved items | userId, itemId, itemType, createdAt; unique(userId,itemType,itemId) |
| Participation | userId, optional eventId, activityId, title, occurredAt, source, status; unique(userId,eventId) |

Rich public content (descriptions, images, schedules, tags, amenities, etc.) is in the validated JSON `payload`; operational/queryable fields are also real attributes. The DAL resolves core columns over payload, reads only published records, derives actual RSVP/follow counts, and memoizes within a server render. It has no static fallback.

## Permissions and write boundaries

All collection permissions are empty and `documentSecurity` is enabled:

- Published content documents have `read("any")` only.
- Private profile/Fitness ID/participation documents have only `read("user:<owner>")`.
- No end user has document create/update/delete permissions. Server routes enforce ownership and validation before elevated writes.
- Draft/unpublished content has no public read grant. Public profiles are not publicly readable Appwrite documents: the server resolves an opt-in public view with field-level privacy controls.

On the inspected Appwrite RC, a no-op update with identical data can return success even without write permission. The integration test verifies denial using an **actual changed field**, not a no-op. Unauthorized data changes are denied.

## Core participation loop

1. Login/signup creates an Appwrite session, stored as an HttpOnly/SameSite=Lax cookie (Secure in production). Interrupted profile/ID setup is repaired by subsequent login without resetting privacy choices.
2. Save/follow/RSVP routes validate input, infer userId from the session and reject cross-origin requests. Duplicate saves/follows are idempotent.
3. RSVP chooses a seat within event capacity; Appwrite's unique seat index is the atomic arbiter during races. Unique user/event index and deterministic document ID prevent duplicate reservations. Cancellation deletes the reservation to free capacity.
4. A participant opens **Show check-in QR** from `/account` or `/fitness-id`, leading to protected `/check-in`. A signed 15-minute identity QR is issued only for the current session owner and works for private profiles. It contains a random public Fitness ID, never an auth account ID, contact details or private history. Refresh uses same-origin `POST /api/check-in/pass` with an empty body; callers cannot select another participant.
5. The club/venue operator uses `/organizer`, selects an assigned event, and scans the participant QR. Camera access works on HTTPS/localhost without requiring `BarcodeDetector`: usable native detection is preferred; `jsqr` is loaded on demand otherwise. Frames remain on-device, processing is throttled, and the camera stops on capture, stop, event change, disable, disconnect or unmount. Paste fallback accepts the participant code; public-profile URLs are not check-in credentials.
6. `POST /api/check-in/organizer` independently authorizes the event's stored `organizerUserId` or exact trusted `admin` label before resolving the private participant. It verifies the signature/purpose, active Fitness ID/account, confirmed RSVP and the event window (30 minutes before start to one hour after end) before creating new attendance. Operator submissions have a bounded 120-per-account/10-minute process-local limit; ordinary mutations retain 5. Old event-token self-check-in at `POST /api/check-in` returns `410 CHECKIN_FLOW_CHANGED` and cannot write attendance. Attendance stores one trusted check-in and one derived verified participation, with owner-only read ACLs. Repeated scans are idempotent; retries repair interrupted/non-verified derived rows and preserve the original timestamp, including after cancellation or QR expiry when trusted attendance already exists.
7. The account/Fitness ID computes verified activities, attended events, followed communities and consecutive IST calendar weeks from actual records. Pending, self-reported, future records and RSVPs never inflate verified totals. Public totals and communities are separately opt-in.

Participant QR is a short-lived identity credential shown to an authorized operator, not cryptographic proof of physical presence or a public entry ticket. The operator is responsible for checking the attendee at the venue; no geolocation claim is made. Keep codes out of recordings and public posts. They are not placed in URLs or public profile DTOs. Public-profile QR sharing remains a separate opt-in feature. Operator results expose display name, event and trusted timestamp, not contact information, account IDs, raw records or private history.

Camera regressions use generated QR pixels and synthetic camera streams, including browsers without native detection, permission denial, late permission grants and cleanup. These tests do not prove physical-device camera permission, rear-lens selection or Safari behavior; verify those over HTTPS on actual devices.

## Content operations

```sh
npm run content -- events list
npm run content -- events put ./event.json
npm run content -- events unpublish DOCUMENT_ID
npm run content -- events delete DOCUMENT_ID --confirm
```

Substitute `places`, `communities` or `activities`. `put` expects a complete domain record with `id`, `slug`, `status`, `demo` and the required fields enforced in `scripts/content.ts`. It synchronizes payload and queryable attributes together. `unpublish` removes public access without erasing linked history. `delete` is explicit and irreversible; it does not cascade private participation.

Use Appwrite Console for user labels and operational inspection. Only trusted administrators may assign `admin`; users cannot promote themselves using account preferences or profile API input. To grant per-event access instead, put that user's Appwrite ID in `organizerUserId` on the event.

## Validation and launch boundaries

`npm test` covers deterministic auth/ownership/privacy, discovery/calendar boundaries and signed-token behavior. `npm run test:e2e` exercises the live backend via browser and HTTP, including concurrent capacity, profile privacy revocation, direct-client ACL denial, session restoration and logout. Test fixtures are created with random IDs and cleaned; use staging.

Operator-scanned check-in verification: 92 unit tests and 82 focused Chromium tests passed, including the camera/scanner, participant/operator flow, account, Fitness ID, admin, landing and motion suites. Camera fixtures use real QR pixels at the participant's 240px size and realistic signed-payload length, but synthetic MediaStreams. Typecheck, production build and the 62-file browser secret scan passed; lint retains one unrelated reel-script warning. A read-only hosted check confirmed the existing Fitness ID `publicId` unique index and bounded lookup query; the hosted camera policy allows `camera=(self)`. No member attendance or account permissions were changed by these checks. Real-device camera behavior and hosted authenticated operator mutations still need staging validation after deployment.

`npm run security:client` scans built browser artifacts and `public/` for configured secret values and server-credential references without printing values. It runs automatically after `npm run build`, including on Netlify. All application Appwrite SDK modules are guarded by `server-only`; client components use same-origin Next.js endpoints and never attach an Appwrite API key.

Before launch:

- Replace/unpublish fictional demos and confirm real meeting points, venues and prices.
- Use HTTPS, a stable supported Appwrite version, least-privilege keys, backups and monitoring.
- Add a shared edge rate limiter for multi-instance deployment; the current process-local limiter intentionally has no cross-process guarantees. `NEXT_PUBLIC_TRUST_PROXY_IP=true` is safe only if a trusted ingress replaces spoofable forwarding headers.
- Rotate previously exposed diagnostic credentials. Never log CLI sessions or API keys.
- Configure and test email delivery, recovery and verification as an onboarding follow-up.
- Stock imagery is illustrative and attributed. Provider integrations are not faked: Strava requires official OAuth configuration, Apple Health requires a native bridge, and Cult.fit/FITPASS require official access.
- No storage bucket, cloud function, payment service or separate backend is required for the shipped slice.
