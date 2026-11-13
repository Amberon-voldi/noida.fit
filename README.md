# NOIDA.FIT

A Noida / Greater Noida discovery and participation product: find an activity, save a plan, RSVP, check in with an organizer, and build a privacy-controlled Fitness ID.

**Next.js 16 App Router · React 19 · TypeScript · Tailwind 4 · Appwrite**

## Run locally

Requires Node.js 22+ and an Appwrite 1.8-compatible deployment.

```sh
npm ci
# Populate .env using .env.example, retaining your existing project credentials.
npm run appwrite:setup
npm run appwrite:seed       # initial provisioning or still-demo IDs only; never production sync
npm run appwrite:verify
npm run dev
```

Existing infrastructure is reused by configured IDs. Setup inspects resources before creation, validates schemas/indexes, and refuses to create same-named duplicates under a different ID. Secrets stay in ignored environment files; never commit `.env`, API keys, session cookies or the generated check-in signing secret.

The current approved catalog contains **26 activities, 12 communities, 18 places, and 24 events** and has been synchronized to Appwrite. Four events are paid: **evt_06 Alpha doubles: rotate and rally — ₹199**, **evt_07 Sector 79 seven-a-side — ₹299**, **evt_12 Core & coffee: mat Pilates — ₹299**, and **evt_18 Alpha beginner doubles clinic — ₹199**; all other events are **FREE**. Venues, activities, and communities have no ticket pricing. Explicitly marked demo fixtures remain supported, but seed is for initial provisioning or updating still-demo IDs only: it preflights source IDs, refuses to overwrite any non-demo editorial record, preserves existing dates by refusing overwrite, and resolves dates for newly seeded records at seed-time Asia/Kolkata. No demo users/passwords, attendance or verified statistics are created. A price of `FREE` takes RSVPs; a rupee amount such as `₹199` sells one ticket per account at that price (see Backend and permissions). No payment checkout is included. The compact home uses one illustrative-listings notice instead of repeated card badges; standard directory/detail views retain per-listing provenance.

## Product routes

- `/` — navbar-free, motion-led community introduction with a clear invitation into the platform
- `/home` — compact public home hub: a small greeting, search, quick plans, activities, and bounded event/community/place cards
- `/discover`, `/search` — URL-based search, activity/type/sector/date/time/price filters
- `/activities`, `/activities/[slug]` — activity directory and relevant listings
- `/events`, `/event/[slug]` — events, RSVP or ticket, cancel, save, share and calendar export; below desktop width a fixed bar above the dock carries the price and the booking button
- `/places`, `/place/[slug]` — venues and related events/communities
- `/communities`, `/community/[slug]` — groups, follow/unfollow and saved interests
- `/signup`, `/login` — Appwrite email/password authentication
- `/account` — Fitness ID, upcoming RSVPs, saved plans, followed groups, history and settings
- `/fitness-id` — the current user's private card
- `/@username` — opt-in public profile; legacy `/fitness-id/[slug]` redirects here
- `/organizer` — assigned club/venue operators select an event and scan participant QRs to record attendance
- `/check-in` — members show/refresh their own short-lived participant QR, including with private profiles
- `/admin` — protected administrator overview and navigation to content, member access, attendance and audit modules
- `/admin/guide` — complete operator handbook: module workflows, page routes, API endpoints, permissions and troubleshooting

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

See [Appwrite operations and schema](docs/engineering/appwrite.md) for environment variables, API-key scopes, content management and check-in setup. The [admin dashboard operations guide](docs/engineering/admin-dashboard.md) covers `/admin`, durable audit setup and privileged browser controls.

- Public published content: read-only documents.
- Accounts/participation: owner-readable, not directly client-writable.
- All mutations: server authenticated, ownership derived from the session, validated input, same-origin checks and bounded requests.
- RSVP uniqueness: unique event/user and event/seat indexes; allocation uses atomic creates, not unsafe read-then-count writes.
- Tickets: a paid event's RSVP is a ticket. `lib/pricing.ts` is the only code that reads `price` as money (integer paise); free-form price text is displayed but never ticketed. The member confirms the amount, the server rejects a stale price, and the ticket keeps the price it was issued at in the RSVP's optional `amount`, `paymentStatus` and `paymentRef` attributes. Run `npm run appwrite:setup` to add them; until then paid events refuse tickets rather than hand out free seats. A paid ticket cannot be cancelled by its holder.
- Check-in: the participant shows a signed 15-minute QR; the assigned club/venue operator or Appwrite `admin` scans it for the selected event. Active account/Fitness ID, confirmed RSVP and the event window are required. Operator cameras use native QR detection or a lazily loaded on-device decoder; paste fallback is retained. Participant self-check-in and old event codes are retired. Retries do not duplicate attendance and repair incomplete participation writes.
- Verified counts: derived from stored check-ins/verified participation, never marketing constants or RSVP totals.

## Content management

Operators with the server credential can manage content without an additional CMS:

```sh
npm run content -- events list
npm run content -- events put ./event.json
npm run content -- events unpublish DOCUMENT_ID
npm run content -- events delete DOCUMENT_ID --confirm
```

Administrators can also manage these four content kinds through `/admin/content/[kind]`, with guided fields, full JSON editing, published-reference validation, stale-form checks, deletion guards and required audit reasons. Configure `NEXT_PUBLIC_APPWRITE_ADMIN_AUDIT_COLLECTION_ID` during build and deployment (public identifier, private audit records), and explicitly run `npm run appwrite:admin-audit` before browser writes are unlocked. This dedicated provisioning command does not change other collection permissions. Member search/access controls additionally need appropriate Appwrite Users API scopes.

The same commands support `places`, `communities`, and `activities`. `put` validates a complete domain record and synchronizes its payload, queryable columns and visibility permissions. Prefer unpublishing over deletion to preserve linked history. Assign `organizerUserId` on an event to authorize an organizer; an Appwrite user label of `admin` grants all-event check-in access. Never give clients collection-wide write permissions.

For future editorial changes, use the supported `npm run content -- ... put` flow or the audited admin UI. Do not use the seed as a production synchronization mechanism.

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

## AWS deployment (ECS Fargate)

The site runs on AWS as a container: Next.js 16 `output: "standalone"` server on Node 22 (`Dockerfile`), on ECS Fargate behind an Application Load Balancer. Public IDs are baked in at build time from `deploy/aws/public.env`; the two secrets come from AWS Secrets Manager at runtime and never enter the image. `.github/workflows/deploy-aws.yml` builds, pushes and deploys on every push to `main` once configured (it is skipped until then).

One-time setup, in the AWS region closest to your Appwrite server:

1. **ECR:** create a private repository, e.g. `noida-fit`.
2. **Secrets Manager:** create a secret, e.g. `noida-fit/production`, with keys `APPWRITE_KEY` and `APPWRITE_CHECKIN_SECRET` (reuse the current check-in secret: a new one invalidates check-in QR codes already issued).
3. **ECS:** create a Fargate cluster and a task definition (family e.g. `noida-fit`, Linux/x86_64, 0.5 vCPU / 1 GB):
   - container `web`, image `<account>.dkr.ecr.<region>.amazonaws.com/noida-fit:latest`, port `3000`;
   - environment `TRUSTED_PROXY_COUNT=1` (the load balancer appends each visitor's address; use `2` if you later put CloudFront in front);
   - secrets `APPWRITE_KEY` and `APPWRITE_CHECKIN_SECRET`, each `valueFrom` `<secret-arn>:<KEY>::`;
   - the task execution role needs ECR pull, CloudWatch Logs, and `secretsmanager:GetSecretValue` on that secret.
4. **Load balancer:** an internet-facing ALB with an ACM certificate for `noida.fit`, HTTP→HTTPS redirect, and an IP target group on port 3000 with health check path `/api/health`. Create the ECS service (desired count `0` for now) attached to it.
5. **GitHub → AWS sign-in:** add the IAM OIDC provider `token.actions.githubusercontent.com` (audience `sts.amazonaws.com`) and a role that trusts `repo:Amberon-voldi/noida.fit:environment:production`. Allow it to push to the ECR repository, `ecs:DescribeTaskDefinition`, `ecs:RegisterTaskDefinition`, `ecs:UpdateService`, `ecs:DescribeServices`, and `iam:PassRole` for the task and execution roles.
6. **Repository variables** (*Settings → Secrets and variables → Actions → Variables*): `AWS_ROLE_ARN`, `AWS_REGION`, `ECR_REPOSITORY`, `ECS_CLUSTER`, `ECS_SERVICE`, `ECS_TASK_FAMILY`, `ECS_CONTAINER_NAME` (`web`).
7. **First deploy:** run *Actions → Deploy to AWS → Run workflow*, then set the service's desired count to `1`. Test through the load balancer: sign up, sign in to `/account`, an admin image upload, and an organizer check-in scan.
8. **Domain:** point `noida.fit` at the load balancer (DNS-only, not proxied, so `TRUSTED_PROXY_COUNT=1` stays correct). Keep the Cloudflare Worker until AWS serves the domain correctly, then remove the Worker route.

Rough cost: Fargate (0.5 vCPU / 1 GB, one task) about $18/month plus the load balancer about $18/month plus data transfer. Uploaded images are served through the app; put CloudFront in front later if image traffic grows.

Local check: `docker build -t noida-fit .` then `docker run -p 3000:3000 -e APPWRITE_KEY=… -e APPWRITE_CHECKIN_SECRET=… noida-fit`.

## Cloudflare Workers deployment (OpenNext)

This is a server-rendered application, not a static Pages export. The repository includes a pinned OpenNext adapter and `wrangler.jsonc` for Worker **`noida-fit`**.

Set these in **Workers & Pages → noida-fit → Settings → Build**:

| Setting | Value |
| --- | --- |
| Build command | `npm run cloudflare:build` |
| Deploy command | `npm run cloudflare:deploy` |
| Root directory | Repository root |

The build command runs the normal Next.js build and security scan, packages `.open-next/worker.js`, then scans `.open-next/assets`. The deploy command deploys that existing bundle; it does not build again. Do not run `migrate` inside CI or deploy `.next` as static files. Standard `npm run build` remains available for Node/Netlify deployments.

- **Build variables:** configure the `NEXT_PUBLIC_*` values from `wrangler.jsonc` in Cloudflare's **Build variables and secrets** as well. Next.js can inline them at build time; runtime Worker variables alone are not sufficient. Rebuild after changing them.
- **Runtime secrets:** set `APPWRITE_KEY` and the persistent `APPWRITE_CHECKIN_SECRET` under the Worker's **Variables and Secrets** as secrets. Never put their values in Wrangler `vars`, source control or `NEXT_PUBLIC_*` settings. `.dev.vars*` is ignored and is for local preview only; it does not provision production secrets.
- `keep_vars: true` retains additional dashboard-managed runtime variables. The public identifiers in `wrangler.jsonc` are not credentials. Keep `NEXT_PUBLIC_SITE_URL` aligned with the HTTPS origin visitors use.
- `workers_dev` and `preview_urls` remain disabled, matching the existing Worker. Keep the intended custom domain/route configured in Cloudflare; this change does not provision or move DNS.
- SSR reads are live, with no ISR/on-demand revalidation. No R2 cache or self-service binding is needed. If revalidation is introduced later, explicitly provision its storage/queue; any `WORKER_SELF_REFERENCE` service must match the Worker name **`noida-fit`**, not `noidafit`.
- OpenNext currently warns that Node.js proxy/middleware support is experimental. A successful bundle/dry-run does not prove hosted login, redirects, or Appwrite connectivity. Verify those after deployment.

Local packaging checks (no deployment):

```sh
npm run cloudflare:build
npx wrangler deploy --dry-run
# Optional local Workers-runtime preview; requires appropriate local configuration:
npm run cloudflare:preview
```

References: [OpenNext setup](https://opennext.js.org/cloudflare/get-started), [cache requirements](https://opennext.js.org/cloudflare/caching).

## Honest integration boundaries

- **Strava:** provider registration exists, but OAuth is not enabled without official application credentials and callback setup.
- **Apple Health:** requires a consented native HealthKit bridge; a website cannot access it directly.
- **Cult.fit / FITPASS:** coming soon, dependent on official APIs/partnerships. No passwords, scraping or unofficial APIs are used.
- **Payments:** no payment gateway is connected. A ticket for a paid event holds a spot with payment `pending`, and the organizer collects the amount at the event. `confirmTicketPayment` in `lib/services/participation.ts` is where a gateway's verified webhook marks a ticket paid.
- Organizer intake remains an explicit email listing-review process. Stories do not pretend to have an active newsletter.
- No storage bucket or cloud function is needed for this slice. Editorial imagery is explicitly illustrative, not proof of a venue or partnership.

## Before a public launch

1. Keep explicitly marked demo fixtures out of production; confirm future schedule changes, meeting points, venue permissions and imagery with organizers.
2. Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS origin and persist `APPWRITE_CHECKIN_SECRET` across deployments.
3. Use a stable supported Appwrite release. The inspected server identifies itself as **1.8.0-RC2**; SDK20 targets 1.8.0, so the SDK warns about the release-candidate suffix despite verified operations. Server upgrades are an operator task, not performed by application setup.
4. Add a shared edge/ingress limiter for multiple instances. Current application limiting is process-local (5 mutations per action/user per 10 minutes). Without a trusted IP-overwriting proxy, anonymous auth attempts share a conservative network bucket. Set `NEXT_PUBLIC_TRUST_PROXY_IP=true` only behind such an ingress.
5. Rotate any credentials previously exposed by CLI diagnostics, use least-privilege runtime keys, configure backups/monitoring, and establish password-recovery/email verification delivery before broader public onboarding.
6. Serve production over HTTPS. Session cookies are HttpOnly, SameSite=Lax and Secure in production. Do not enable a production insecure-cookie workaround.

Read [the project documentation hub](docs/README.md) before extending product behavior. Historical docs describe the earlier seed-only V1; this README and the Appwrite operations guide describe the current implementation.
