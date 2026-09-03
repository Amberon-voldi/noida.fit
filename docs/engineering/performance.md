# Performance Architecture & Core Web Vitals — NOIDA.FIT

## 1. Performance Philosophy: Sub-Second Civic Utility

Athletes access NOIDA.FIT while walking to dawn workouts, often on variable 4G/5G mobile connections. A sluggish, bloated website fails our real-world mission.

### Core Web Vitals Targets

| Metric | Target SLA | Strategy to Achieve |
| :--- | :--- | :--- |
| **LCP (Largest Contentful Paint)** | `< 1.2s` | Server-rendered HTML, preloaded hero imagery, zero render-blocking client scripts. |
| **INP (Interaction to Next Paint)** | `< 80ms` | Debounced search input, zero synchronous main-thread blocking, minimal React client tree. |
| **CLS (Cumulative Layout Shift)** | `< 0.02` | Explicit `width` and `height` attributes on all images, skeleton containers matching card heights. |
| **FCP (First Contentful Paint)** | `< 0.8s` | Next.js App Router streaming with edge CDN caching. |

---

## 2. Image Optimization Protocol

1. **Native `next/image` Exclusively:** Never use raw `<img>` tags for content assets.
2. **Explicit Dimensions:** Always supply `width` and `height` or `fill` with `sizes` to eliminate layout shift:
   ```tsx
   <Image
     src={event.coverImageUrl}
     alt={event.title}
     fill
     sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
     className="object-cover group-hover:scale-105 transition-transform duration-300"
     priority={isHero} // Priority preload ONLY for above-the-fold hero imagery
   />
   ```
3. **Format Support:** Automatically serve next-generation AVIF and WebP formats configured in `next.config.ts`.
4. **SVG Inlining:** Icons and wordmarks should be inlined SVGs to eliminate extra HTTP requests.

---

## 3. Rendering Strategy: Static Generation & ISR

```text
┌─────────────────────────────────────────────────────────────┐
│ Static Site Generation (SSG) / ISR                          │
│ • Homepage (/)                                              │
│ • Community Hubs (/community/[slug]) via generateStaticParams│
│ • Place Pages (/place/[slug])                               │
│ • Editorial Articles (/story/[slug])                        │
│ -> Pre-rendered at build time; instant TTFB from edge CDN.  │
├─────────────────────────────────────────────────────────────┤
│ Incremental Static Regeneration (ISR)                       │
│ • Event Calendar (/events)                                  │
│ • Event Details (/event/[slug])                             │
│ -> Revalidated every 60 seconds (revalidate = 60).          │
└─────────────────────────────────────────────────────────────┘
```

### Dynamic Pre-Rendering Pattern
```tsx
// app/community/[slug]/page.tsx
export async function generateStaticParams() {
  const communities = await getCommunities();
  return communities.map((community) => ({
    slug: community.slug,
  }));
}
```

---

## 4. JavaScript Bundle Discipline

1. **Avoid Heavy Dependencies:**
   - No Moment.js or date-fns (use native `Intl.DateTimeFormat` or tiny utilities).
   - No Lodash (use modern ES2022+ array methods: `.filter()`, `.map()`, `.find()`).
   - No heavy animation frameworks like Framer Motion unless strictly necessary (prefer native Tailwind CSS transitions and keyframes).
2. **Client Component Tree Auditing:**
   - Periodically inspect `@next/bundle-analyzer`.
   - Ensure the total initial client JavaScript payload remains **under 85 KB gzipped**.
