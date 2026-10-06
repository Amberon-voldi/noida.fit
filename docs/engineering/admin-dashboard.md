# Admin dashboard — NOIDA.FIT

## Access and navigation

Sign in with an Appwrite account carrying the exact `admin` label, then visit `/admin`. The desktop navigation and mobile menu show Admin only to administrators. Every admin page and API checks the session and label independently; the layout check is not the sole security boundary. Guests go to login; non-admin pages are not found; APIs return 401/403. Admin routes are excluded from the sitemap/search indexing.

The permanent **Complete admin guide** link opens `/admin/guide`. It includes module workflows, all page routes and API methods, setup, permissions, common failures and launch checks. A shorter guide remains on the overview.

## Implemented modules

| Module | Route | Operations |
| --- | --- | --- |
| Overview | `/admin` | Request-time content, intent/attendance and privacy aggregates; configuration presence without secrets; recent audit |
| Events | `/admin/content/events` | Create/edit, publish/draft/cancel, feature, capacity/schedule validation, organizer assignment/removal |
| Clubs | `/admin/content/communities` | Identity, weekly schedule, captains, channels, home venue, verified/featured flags |
| Places | `/admin/content/places` | Venue/location, pin, amenities, access information, media |
| Activities | `/admin/content/activities` | Activity taxonomy, description and imagery |
| Members | `/admin/members` | Paginated search, suspend/restore, revoke sessions, grant/remove admin, hide public profile |
| Attendance | `/admin/attendance` | Event roster, check-in versus RSVP reconciliation, current-page CSV, derived participation repair |
| Live QR | `/organizer` | Existing authorized event QR desk and privacy-safe attendee state |
| Audit | `/admin/audit` | Newest-first durable admin action intent/completion/failure, 50 entries per page |
| Guide | `/admin/guide` | Operator handbook with routes, API endpoints, workflows and security boundaries |

Content forms have guided basics and advanced JSON for all nested fields. They share runtime Zod schemas with the content CLI. Creates use atomic create, never upsert; updates require the previous `$updatedAt`; linked slugs cannot change; deletes require typed IDs and reject linked content/private participation. Published references and IST timestamps are validated, and capacity cannot exclude confirmed allocated seats.

**Concurrency caveat:** updatedAt read-before-write is not atomic compare-and-swap. Reference checks cannot atomically exclude racing participation writes. Prefer unpublishing/drafting over permanent deletion. No cascade erases private history.

## Admin API

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/admin/content/[kind]` | List/filter full editorial records (`activities`, `communities`, `places`, `events`) |
| POST | `/api/admin/content/[kind]` | Create validated draft/published record (generated immutable ID) |
| PUT | `/api/admin/content/[kind]` | Save validated record with expectedUpdatedAt and reason |
| DELETE | `/api/admin/content/[kind]` | Typed confirmation + reference guards + audit reason |
| GET | `/api/admin/members?q=&offset=` | Minimal 25-account page, no emails or sessions |
| POST | `/api/admin/members` | Audited access/role/session/public-profile action with typed target ID |
| GET | `/api/admin/attendance?eventId=&offset=` | 50 roster entries, aggregate counts, repair-needed state |
| POST | `/api/admin/attendance` | Derive verified participation only from an existing trusted check-in |
| GET | `/api/admin/audit?offset=` | 50 newest audit entries |

All reads require admin sessions and return private/no-store. Writes also require the same origin, bounded JSON, input validation, process-local rate limits and durable audit intent. Content alone has a 64 KiB body allowance; ordinary requests retain the 8 KiB limit. Responses never forward raw SDK error payloads.

## Audit setup (explicit opt-in)

Add a private `APPWRITE_ADMIN_AUDIT_COLLECTION_ID` to ignored local/deployment configuration. It is not a public variable and is not required for normal member/discovery behavior.

```sh
# After setting your chosen collection ID, using a schema-management key:
npm run appwrite:admin-audit
```

The dedicated script provisions only the audit collection in the existing database and refuses mismatched schemas or insecure existing permissions. It never reconciles the other platform table ACLs.

Schema: actorId string(36), action(80), target(160), reason(300), status(20), required occurredAt datetime, optional finishedAt datetime. Index `audit_time` on occurredAt. Document security enabled; no collection/document client grants. Server-only admins read it through the authenticated application boundary.

The application records **started** before running any change. If that write fails, the action does not run. After the action it records completed/failed. If completion storage fails, the response warns that the operation may already have succeeded: inspect the target and started entry before retrying. No raw content, passwords, keys or session values are written by the application to audit rows. Reasons are operator-supplied; do not enter credentials or private contact details. Actor ID stays in the private audit store for attribution, not in the UI DTO.

The audit covers browser admin mutations. Historical CLI edits, Appwrite Console edits and QR generation are not retroactively audited by this new store. Configure retention, backups and access monitoring operationally.

## Runtime scopes and bootstrap

Bootstrap the first admin label through Appwrite Console. Existing administrators can manage other accounts' admin labels after audit provisioning. Self-targeted administrative access changes are blocked. Unrelated labels are preserved.

Runtime: document read/write; member listing and organizer assignment verification need users.read; status/labels/session controls need the appropriate Users API write scopes supported by the installed Appwrite version. Runtime keys should not manage database schemas. A missing users.read scope makes auth-user totals unavailable without hiding document-derived dashboard counts.

Suspend and restore use Appwrite account status. Revoke sessions is explicit and separate. Profile hiding resets visibility/activity/community sharing to private, but does not permanently lock the member's own future privacy settings. Attendance repair cannot mint arbitrary attendance and preserves the original check-in timestamp, including after cancellation.

## Public-table policy caveat

The existing public content tables may grant collection-level `read(any)`. Document `permissions: []` therefore does **not** make a draft confidential against direct Appwrite reads; only the application's public loaders filter to published. Never store secrets or moderation/private member data in content payloads. Do not run the general setup/ACL tools blindly: their empty-collection policy differs from the current public-table policy and needs a separate migration decision.

## Not implemented as pretend controls

Payments/refunds, provider integrations, broadcast messaging, club staff invitations, waitlist promotion and distributed analytics need separate services/data models. Secret rotation, DNS, backup administration, schema migration and deployment remain infrastructure operations. The dashboard does not run arbitrary shell commands or pretend these features are integrated.

## Verification boundaries

Deterministic tests use a synthetic Appwrite transport for authorization, minimized DTOs, audited CRUD, stale forms, references, capacity, member access and repair. Browser fixtures exercise the real components with synthetic already-authorized props; they do not claim hosted authentication or real Appwrite persistence. Guest route/API tests exercise denial using the running application.

Local implementation verification: `npm test` passed 84 cases; `npm run lint` passed with one unrelated pre-existing reel-script warning; `npm run typecheck` and `npm run build` passed; the post-build secret scan checked 61 files. The focused Playwright run of `admin.spec.ts`, `admin-workspace.spec.ts`, `account-workspace.spec.ts`, `landing.spec.ts`, and `motion.spec.ts` passed 32 tests, including 320/390/768/1440px overview checks, 320px content/member/attendance no-overflow checks, guest API denial, typed confirmation and stale-save behavior. `git diff --check` passed.

Audit provisioning and privileged writes against a real hosted Appwrite project were not performed. Before launch, provision audit on staging and verify an admin and non-admin account, persistence/read-back, user-label/session changes, every content kind, CSV, QR/check-in, origin cookies, hosted Appwrite scopes and native mobile QR behavior. No schema/ACL tool should be executed against production solely to make a test pass.
