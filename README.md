# NOIDA.FIT

A Noida / Greater Noida discovery and participation product: find an activity, save a plan, RSVP, check in with an organizer, and build a privacy-controlled Fitness ID.

**Next.js 16 App Router · React 19 · TypeScript · Tailwind 4 · Appwrite**

## Run locally

Requires Node.js 22+ and an Appwrite 1.8-compatible deployment.

```sh
npm ci
# Populate .env using .env.example, retaining your existing project credentials.
npm run appwrite:setup
npm run appwrite:seed       # optional: clearly marked fictional demo listings
npm run appwrite:verify
npm run dev
```

Existing infrastructure is reused by configured IDs. Setup inspects resources before creation, validates schemas/indexes, and refuses to create same-named duplicates under a different ID. Secrets stay in ignored environment files; never commit `.env`, API keys, session cookies or the generated check-in signing secret.

The current seed contains **24 events, 12 fictional communities, 18 places, and 26 activities**. Dates are fixed at seed time. No demo users/passwords, attendance or verified statistics are created. Real landmarks are discovery examples only; every listing is labelled demo and must not be used for travel or payment decisions.

## Product routes

- `/` — discovery-first home, next seven days, activities, communities, places and weekend sessions
- `/discover`, `/search` — URL-based search, activity/type/sector/date/time/price filters
- `/activities`, `/activities/[slug]` — activity directory and relevant listings
- `/events`, `/event/[slug]` — events, RSVP/cancel, save, share and calendar export
- `/places`, `/place/[slug]` — venues and related events/communities
- `/communities`, `/community/[slug]` — groups, follow/unfollow and saved interests
- `/signup`, `/login` — Appwrite email/password authentication
- `/account` — Fitness ID, upcoming RSVPs, saved plans, followed groups, history and settings
- `/fitness-id` — the current user's private card
- `/@username` — opt-in public profile; legacy `/fitness-id/[slug]` redirects here
- `/organizer` — authorized event organizers generate short-lived check-in QR codes
- `/check-in` — RSVPed members verify an organizer-provided check-in code

Profiles start **private**. Public sharing, activity totals and community sharing are separately controlled. Public DTOs do not include email, Appwrite user ID, private history, saves, RSVPs or provider tokens.

## Architecture

```text
app/                         Server-rendered routes and authenticated API handlers
components/discovery/        Shared filtering, search, images, detail and empty-state UI
components/participation/    Persistent RSVP/save/follow/check-in interactions
components/profile/          Fitness ID sharing, settings and activity summaries
lib/data.ts                  Request-memoized, published-only Appwrite directory access
lib/appwrite/                Server-only configuration, SDK, auth and profile persistence
lib/services/participation.ts Ownership, unique-seat allocation, signed check-in verification
lib/calendar.ts              RFC 5545 download generation, fixed Asia/Kolkata conversion
types/                       Domain types and public/private contracts
scripts/                     Idempotent setup, seed, verification and content operations
tests/                       Unit and live browser/API integration tests
```

There is no runtime seed fallback or device-only RSVP storage. Backend outages show error states rather than invented data. NextAuth/demo credentials were removed; Appwrite is the identity source of truth.

## Backend and permissions

See [Appwrite operations and schema](docs/engineering/appwrite.md) for environment variables, API-key scopes, content management and check-in setup.

- Public published content: read-only documents.
- Accounts/participation: owner-readable, not directly client-writable.
- All mutations: server authenticated, ownership derived from the session, validated input, same-origin checks and bounded requests.
- RSVP uniqueness: unique event/user and event/seat indexes; allocation uses atomic creates, not unsafe read-then-count writes.
- Check-in: assigned organizer or Appwrite `admin` label creates an HMAC-signed 15-minute code. Confirmed RSVP and the event time window are required. Retries do not duplicate attendance and repair incomplete participation writes.
- Verified counts: derived from stored check-ins/verified participation, never marketing constants or RSVP totals.

## Content management

Operators with the server credential can manage content without an additional CMS:

```sh
npm run content -- events list
npm run content -- events put ./event.json
npm run content -- events unpublish DOCUMENT_ID
npm run content -- events delete DOCUMENT_ID --confirm
```

The same commands support `places`, `communities`, and `activities`. `put` validates a complete domain record and synchronizes its payload, queryable columns and visibility permissions. Prefer unpublishing over deletion to preserve linked history. Assign `organizerUserId` on an event to authorize an organizer; an Appwrite user label of `admin` grants all-event check-in access. Never give clients collection-wide write permissions.

## Tests and quality checks

```sh
npm test                 # deterministic unit tests; no remote credentials required
npm run lint
npm run typecheck
npm run build
npm run security:client  # scans built browser artifacts for configured secret values
npm audit
npm run appwrite:verify  # live schema/index/ACL and reference checks
```

Live browser tests require the app running and the configured Appwrite project:

```sh
npx playwright install chromium
npm run dev
# In another terminal:
npm run test:e2e
# Optional: E2E_BASE_URL=http://localhost:3100 npm run test:e2e
```

These tests create randomly named test accounts and two temporary events, exercise signup/session restoration, saving/following, concurrent RSVP capacity, organizer check-in, privacy, QR-card interaction and logout, then delete only their own fixtures. Traces/video/screenshots are disabled for auth tests to avoid retaining credentials. Run against a development/staging project, not a live public event database.

## Honest integration boundaries

- **Strava:** provider registration exists, but OAuth is not enabled without official application credentials and callback setup.
- **Apple Health:** requires a consented native HealthKit bridge; a website cannot access it directly.
- **Cult.fit / FITPASS:** coming soon, dependent on official APIs/partnerships. No passwords, scraping or unofficial APIs are used.
- Paid event prices are informational. RSVP does not charge, reserve paid inventory, or replace an organizer's payment flow.
- Organizer intake remains an explicit email listing-review process. Stories do not pretend to have an active newsletter.
- No storage bucket or cloud function is needed for this slice. Editorial imagery is explicitly illustrative, not proof of a venue or partnership.

## Before a public launch

1. Replace or unpublish demo listings with organizer-confirmed schedules, venue permissions and real imagery.
2. Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS origin and persist `APPWRITE_CHECKIN_SECRET` across deployments.
3. Use a stable supported Appwrite release. The inspected server identifies itself as **1.8.0-RC2**; SDK20 targets 1.8.0, so the SDK warns about the release-candidate suffix despite verified operations. Server upgrades are an operator task, not performed by application setup.
4. Add a shared edge/ingress limiter for multiple instances. Current application limiting is process-local (5 mutations per action/user per 10 minutes). Without a trusted IP-overwriting proxy, anonymous auth attempts share a conservative network bucket. Set `TRUST_PROXY_IP=true` only behind such an ingress.
5. Rotate any credentials previously exposed by CLI diagnostics, use least-privilege runtime keys, configure backups/monitoring, and establish password-recovery/email verification delivery before broader public onboarding.
6. Serve production over HTTPS. Session cookies are HttpOnly, SameSite=Lax and Secure in production. Do not enable a production insecure-cookie workaround.

Read [the project documentation hub](docs/README.md) before extending product behavior. Historical docs describe the earlier seed-only V1; this README and the Appwrite operations guide describe the current implementation.
