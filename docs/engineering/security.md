# Security, Trust & Content Moderation — NOIDA.FIT

## 1. Security Architecture & Threat Model

NOIDA.FIT connects real human beings in physical spaces across Noida. Because our platform directs people to physical meetups at dawn, **trust, safety, and data integrity are non-negotiable**.

---

## 2. Core Security Protocols

### 1. Form Validation & Input Sanitization
- All form inputs (Search, RSVP intake, Organizer submission) must be strictly validated at runtime using **Zod** or equivalent schema validators:
  - Trim whitespace.
  - Enforce maximum string lengths (e.g. Community name max 64 chars, Description max 1,000 chars).
  - Strip HTML and script tags to prevent Cross-Site Scripting (XSS).
- Never render raw unescaped HTML (`dangerouslySetInnerHTML`) with user-supplied content.

### 2. Rate Limiting & Anti-Spam (API & Forms)
- Protect all public POST endpoints (e.g. `/api/rsvp`, `/api/submit-community`):
  - In-memory or Redis-backed sliding window rate limiter: max **5 submissions per IP per 10-minute window**.
  - Invisible honeypot field in public forms to trap automated spam bots.
  - Cloudflare Turnstile or reCAPTCHA v3 on public intake forms if spam thresholds are breached.

### 3. HTTP Security Headers
Configure strong security headers in `next.config.ts`:

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
];
```

---

## 3. Trust & Community Verification Standards

Because anyone can submit an event or group, we enforce a multi-tier trust model:

```text
┌────────────────────────────────────────────────────────┐
│ TIER 1: Unverified Community / Submission              │
│ • Marked with "Community Submitted" disclaimer.        │
│ • Requires manual editorial review before homepage.    │
├────────────────────────────────────────────────────────┤
│ TIER 2: Verified Community (Verified Badge)            │
│ • Confirmed real-world presence (Instagram/WhatsApp).  │
│ • Verified captain identity and recurring cadence.     │
│ • Eligible for featured hero placement.                │
├────────────────────────────────────────────────────────┤
│ TIER 3: Official Civic Partner                         │
│ • Registered sporting body, stadium authority, or club.│
└────────────────────────────────────────────────────────┘
```

### Safety Disclaimer Requirements
Every public event detail page must include a standardized safety note:
> *"NOIDA.FIT is a discovery platform connecting independent sports communities. Participants join voluntary community workouts at their own discretion and are responsible for their own personal safety and physical readiness."*
