import Link from "next/link";
import { ArrowUpRight, BookOpen, ChevronDown } from "lucide-react";
import type { AdminContentKind, AdminDashboardData, AdminEventEntry } from "@/types/admin";
import { endpointGuide, pageGuide } from "@/lib/admin/guide";

export interface AdminDashboardProps { data: AdminDashboardData; }

const contentLabels: Record<AdminContentKind, string> = { events: "Events", communities: "Communities", places: "Places", activities: "Activities" };
const contentKinds = Object.keys(contentLabels) as AdminContentKind[];
const statusLabels: Record<string, string> = { published: "Published", draft: "Draft", cancelled: "Cancelled", unknown: "Unknown", started: "Started", completed: "Completed", failed: "Failed" };
const formatTime = (value: string) => new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

const GUIDE_SECTIONS = [
  { id: "guide-overview", title: "Dashboard overview", body: "Counts are read from Appwrite at request time. The overview never displays API keys, session secrets, user IDs, email addresses, raw payload JSON or private attendance history." },
  { id: "guide-content", title: "Content operations", body: "Manage activities, clubs, events and places in the Content modules. Create drafts, complete the guided fields or advanced JSON, then save or publish. Changes require an audit reason and a configured private audit store. Linked records cannot be deleted; prefer draft/unpublish. Content payloads must never contain secrets, including drafts: table-level public reads may expose them outside the public app." },
  { id: "guide-organizers", title: "Organizer operations", body: "Assign an event organizer in the event editor using organizerUserId. That account gains event-scoped /organizer access, not global admin rights. Admins can operate all event QR desks. The Members module manages admin labels with typed confirmation, a reason and self-action protection." },
  { id: "guide-participation", title: "Participation and identity", body: "RSVPs are intent, check-ins are organizer-verified attendance, participations are the derived Fitness ID record, memberships are follows, and saved items are private bookmarks. Profile visibility, activity sharing and community sharing are separate settings. Never use RSVP counts as attendance." },
  { id: "guide-security", title: "Security and privacy", body: "All mutation endpoints authenticate the session, enforce same-origin requests, validate JSON with Zod and apply a process-local rate limit. Private collections are owner-readable through Appwrite document ACLs. Admin reads use the server key and are reduced to aggregate or privacy-safe DTOs before rendering." },
  { id: "guide-failures", title: "Failure and incident handling", body: "Check environment variable names and deployment secrets without copying secret values into tickets. If Appwrite is unavailable, preserve the error state and retry. If content is wrong, unpublish first. If a trusted check-in exists but derived participation needs repair, use Attendance or ask the assigned operator to scan the participant’s QR again." },
];

function Disclosure({ title, note, children, id }: { title: string; note?: string; children: React.ReactNode; id?: string }) {
  return <details className="admin-disclosure" id={id}>
    <summary><span>{title}{note && <small>{note}</small>}</span><ChevronDown size={16} aria-hidden="true" /></summary>
    <div className="admin-disclosure-body">{children}</div>
  </details>;
}

function StatusPill({ value }: { value: string }) {
  return <span className="admin-status" data-status={value}>{statusLabels[value] ?? value}</span>;
}

function EventSummary({ event }: { event: AdminEventEntry }) {
  return <li className="admin-event-row">
    <div><strong>{event.title}</strong><p>{event.date || "Date not set"} · {event.organizerAssigned ? "Organizer assigned" : "Organizer unassigned"}</p></div>
    <div className="admin-event-counts"><StatusPill value={event.status} /><span><strong>{event.confirmedRsvps}</strong> RSVPs · <strong>{event.checkins}</strong> check-ins</span></div>
  </li>;
}

export function AdminDashboard({ data }: AdminDashboardProps) {
  const totalContent = Object.values(data.content).reduce((total, item) => total + item.total, 0);
  // A failed request returns zero-filled DTOs. Do not present those placeholders as real counts.
  const count = (value: number) => data.backendError ? "—" : value;
  const secondaryCounts = [
    ["Upcoming events", data.operational.upcomingEvents], ["Past published events", data.operational.pastEvents],
    ["Assigned events", data.operational.assignedEvents], ["Cancelled events", data.operational.cancelledEvents],
    ["Verified communities", data.operational.verifiedCommunities], ["Demo listings", data.operational.demoListings],
    ["Profiles", data.users.profiles], ["Public profiles", data.users.publicProfiles], ["Private profiles", data.users.privateProfiles],
    ["Share activity", data.users.activitySharing], ["Share communities", data.users.communitySharing],
    ["Cancelled RSVPs", data.participation.cancelledRsvps], ["Waitlisted RSVPs", data.participation.waitlistedRsvps],
    ["Pending / self-reported participation", data.participation.pendingParticipations],
    ["Active follows", data.participation.activeMemberships], ["Saved items", data.participation.savedItems],
  ] as const;
  const metrics = [
    { label: "Auth users", value: data.backendError ? "—" : data.users.total ?? "Unavailable", note: data.users.total === null ? "Requires Appwrite users.read" : `${count(data.users.profiles)} profiles · ${count(data.users.publicProfiles)} public` },
    { label: "Content records", value: count(totalContent), note: `${count(data.operational.demoListings)} marked demo` },
    { label: "Confirmed RSVPs", value: count(data.participation.confirmedRsvps), note: `${count(data.participation.checkins)} trusted check-ins` },
    { label: "Verified participation", value: count(data.participation.verifiedParticipations), note: `${count(data.participation.pendingParticipations)} pending / self-reported` },
  ];

  return <div className="admin-page admin-dashboard">
    <header className="admin-page-header">
      <div><p className="eyebrow">NOIDA.FIT control room</p><h1 className="admin-title">Admin dashboard</h1><p className="admin-intro">Content, participation and operator tasks. Request-time counts, not analytics.</p></div>
      <Link href="/admin/guide" className="button-secondary"><BookOpen size={16} aria-hidden="true" />Complete admin guide</Link>
    </header>

    {data.backendError && <p className="admin-warning" role="alert">{data.backendError === "not_configured" ? "Server configuration is incomplete." : "Appwrite could not be read for this request."} Metrics are unavailable (—); zero-filled fallback data is not an operational snapshot.</p>}

    <section className="admin-metric-strip" aria-label="Platform overview">
      {metrics.map(metric => <div key={metric.label}><p className="admin-metric-label">{metric.label}</p><p className="admin-metric-value">{metric.value}</p><p className="admin-note">{metric.note}</p></div>)}
    </section>

    <section aria-labelledby="operations-heading" className="admin-section">
      <div className="admin-section-heading"><h2 id="operations-heading">What needs attention</h2><Link href="/organizer" className="admin-text-link">Organizer workspace <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
      <ul className="admin-task-list">
        <li><div><strong>{count(data.operational.unassignedPublishedEvents)} published {data.operational.unassignedPublishedEvents === 1 ? "event" : "events"} without an organizer</strong><p>Assign an owner for event-scoped QR access.</p></div><Link href="/admin/content/events" className="admin-text-link">Review events <ArrowUpRight size={14} aria-hidden="true" /></Link></li>
        <li><div><strong>{count(data.operational.demoListings)} demo listings</strong><p>Review fictional content before public launch.</p></div><Link href="#content-heading" className="admin-text-link">Review directory <ArrowUpRight size={14} aria-hidden="true" /></Link></li>
        <li><div><strong>Browser mutation audit</strong><p>{data.backendError ? "Audit state was not established by this request." : data.audit.configured ? data.audit.readable ? "Readable. Each action records durable intent before changing data." : "Configured, but unreadable. Check Appwrite permissions and availability." : "Not configured. Privileged browser writes stay locked."}</p></div><Link href={data.audit.configured && !data.backendError ? "/admin/audit" : "/admin/guide#setup"} className="admin-text-link">{data.audit.configured && !data.backendError ? "Review audit" : "Audit setup"} <ArrowUpRight size={14} aria-hidden="true" /></Link></li>
      </ul>
    </section>

    <section aria-labelledby="content-heading" className="admin-section">
      <div className="admin-section-heading"><h2 id="content-heading">Directory inventory</h2><span className="admin-note">Demo counts overlap status counts</span></div>
      <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Directory inventory, scroll for all columns"><table className="admin-table admin-inventory-table"><caption className="sr-only">Content counts by editorial status</caption><thead><tr><th scope="col">Content</th><th scope="col">Total</th><th scope="col">Published</th><th scope="col">Draft</th><th scope="col">Cancelled</th><th scope="col">Demo</th><th scope="col">Manage</th></tr></thead><tbody>{contentKinds.map(kind => <tr key={kind}><th scope="row">{contentLabels[kind]}</th>{(["total", "published", "draft", "cancelled", "demo"] as const).map(key => <td key={key}>{count(data.content[kind][key])}</td>)}<td><Link href={`/admin/content/${kind}`} className="admin-text-link" aria-label={`Manage ${contentLabels[kind]}`}>Manage <ArrowUpRight size={14} aria-hidden="true" /></Link></td></tr>)}</tbody></table></div>
      <Disclosure title="Content labels" note="Records returned in this snapshot">
        <div className="admin-label-grid">{contentKinds.map(kind => <div key={kind}><h3>{contentLabels[kind]}</h3><ul className="admin-label-list">{data.entries[kind].map(entry => <li key={entry.id}><span>{entry.label}{entry.demo && <small> · demo</small>}</span><StatusPill value={entry.status} /></li>)}{!data.entries[kind].length && <li>{data.backendError ? "Records unavailable." : "No records returned."}</li>}</ul></div>)}</div>
      </Disclosure>
    </section>

    <div className="admin-summary-grid">
      <section aria-labelledby="events-heading" className="admin-section">
        <div className="admin-section-heading"><h2 id="events-heading">Event snapshot</h2><Link href="/admin/attendance" className="admin-text-link">Attendance <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
        <p className="admin-note">{count(data.operational.upcomingEvents)} upcoming · {count(data.operational.pastEvents)} past published · RSVPs are not attendance</p>
        <ul className="admin-event-list">{data.entries.events.slice(0, 3).map(event => <EventSummary key={event.id} event={event} />)}{!data.entries.events.length && <li className="admin-empty">{data.backendError ? "Event records unavailable." : "No event records returned."}</li>}</ul>
        {data.entries.events.length > 3 && <Disclosure title={`More event records (${data.entries.events.length - 3})`} note="Remaining records in this snapshot"><ul className="admin-event-list">{data.entries.events.slice(3).map(event => <EventSummary key={event.id} event={event} />)}</ul></Disclosure>}
      </section>

      <section aria-labelledby="audit-heading" className="admin-section">
        <div className="admin-section-heading"><h2 id="audit-heading">Recent admin audit</h2><Link href="/admin/audit" className="admin-text-link">Full trail <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
        <p className="admin-note">Started is not completed. Inspect the target before retrying.</p>
        {data.backendError ? <p className="admin-empty">Audit state unavailable for this request.</p> : !data.audit.configured ? <p className="admin-empty">Audit not configured. Read-only metrics remain available; browser mutations require <code>NEXT_PUBLIC_APPWRITE_ADMIN_AUDIT_COLLECTION_ID</code> pointing to a private ownerless collection. <Link href="/admin/guide#setup" className="admin-text-link">Read setup instructions</Link></p> : !data.audit.readable ? <p className="admin-warning" role="alert">Audit could not be read. Verify the collection and server document permissions before making changes.</p> : data.audit.entries.length ? <ul className="admin-audit-list">{data.audit.entries.slice(0, 3).map(entry => <li key={entry.id}><div className="admin-audit-meta"><time dateTime={entry.occurredAt}>{formatTime(entry.occurredAt)} IST</time><StatusPill value={entry.status} /></div><p><strong>{entry.action}</strong> · {entry.target}</p><p className="admin-note">Reason: {entry.reason}</p></li>)}</ul> : <p className="admin-empty">Audit store is readable. No admin actions recorded yet.</p>}
        {data.audit.entries.length > 3 && <Disclosure title={`More audit entries (${data.audit.entries.length - 3})`}><ul className="admin-audit-list">{data.audit.entries.slice(3).map(entry => <li key={entry.id}><div className="admin-audit-meta"><time dateTime={entry.occurredAt}>{formatTime(entry.occurredAt)} IST</time><StatusPill value={entry.status} /></div><p><strong>{entry.action}</strong> · {entry.target}</p><p className="admin-note">Reason: {entry.reason}</p></li>)}</ul></Disclosure>}
      </section>
    </div>

    <section aria-labelledby="details-heading" className="admin-section">
      <div className="admin-section-heading"><h2 id="details-heading">Details & references</h2><span className="admin-note">Expand when needed</span></div>
      <div className="admin-disclosure-stack">
        <Disclosure title="Participation, identity & secondary counts" note="Intent, trusted attendance and privacy remain distinct">
          <dl className="admin-count-grid">{secondaryCounts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{count(value)}</dd></div>)}</dl>
          <p className="admin-note">Saved items are private bookmarks. Profile visibility, activity sharing and community sharing are separate member settings.</p>
        </Disclosure>
        <Disclosure title="Safe configuration view" note={data.configuration.ready ? "Required configuration fields present; not a backend health check" : "Required configuration fields missing"}>
          <dl className="admin-config-grid"><div><dt>Appwrite endpoint</dt><dd>{data.configuration.endpointOrigin}</dd></div><div><dt>Project</dt><dd>{data.configuration.projectId}</dd></div><div><dt>Database</dt><dd>{data.configuration.databaseId}</dd></div><div><dt>Server key</dt><dd>{data.configuration.apiKeyPresent ? "Present · value hidden" : "Missing"}</dd></div><div><dt>Check-in secret</dt><dd>{data.configuration.checkInSecretPresent ? "Present · value hidden" : "Missing"}</dd></div><div><dt>Canonical site URL</dt><dd>{data.configuration.siteUrlPresent ? "Configured" : "Not configured"}</dd></div></dl>
          {data.configuration.missing.length > 0 && <p className="admin-warning">Missing configuration: {data.configuration.missing.join(", ")}</p>}
          <p className="admin-note">Schema, indexes and ACL exactness are verified from the operator shell, never silently changed here.</p><code className="admin-command">npm run appwrite:verify</code>
        </Disclosure>
        <Disclosure title="Operator tools & capability boundaries">
          <nav className="admin-operator-links" aria-label="Operator tools">{[["/organizer", "Organizer workspace", "Events, QR and attendance"], ["/for-organizers", "Organizer intake", "Listing review guidance"], ["/communities", "Public communities", "Review published club pages"], ["/events", "Public events", "Review event discovery"]].map(([href, label, note]) => <Link key={href} href={href} className="admin-text-link"><span>{label}<small className="admin-note">{note}</small></span><ArrowUpRight size={14} aria-hidden="true" /></Link>)}</nav>
          <div className="admin-boundaries"><div><h3>Available in product</h3><p>Content CRUD and moderation, organizer assignment, member access controls, session revocation, profile hiding, attendance repair, CSV export and durable admin audit history when configured.</p></div><div><h3>Operator shell</h3><p>Audit/schema provisioning, secret rotation, ACL policy migration, backups, logs and deployments remain CLI or infrastructure operations. No arbitrary shell commands run here.</p></div><div><h3>Not integrated</h3><p>Payments/refunds, automated broadcasts, provider OAuth, club staff invitations and waitlist promotion require separate integrations and data models. Attendance is never fabricated by an admin button.</p></div></div>
        </Disclosure>
        <Disclosure title="Admin guide quick reference" note="Workflows, safety and incident handling" id="guide">
          <p className="admin-note"><Link href="/admin/guide" className="admin-text-link">Open the complete guide</Link> for all modules, setup instructions and incident workflows.</p>
          <div className="admin-disclosure-stack">{GUIDE_SECTIONS.map(section => <Disclosure key={section.id} title={section.title} id={section.id}><p className="admin-note">{section.body}</p></Disclosure>)}</div>
        </Disclosure>
        <Disclosure title="Routes, endpoints & ownership" note="Complete reference map; endpoints are documentation, not action links">
          {[{ caption: "Page routes", entries: pageGuide }, { caption: "API endpoints", entries: endpointGuide.map(([method, path, access, description]) => [path, access, `${method}: ${description}`]) }].map(({ caption, entries }) => <div key={caption} className="admin-table-wrap" tabIndex={0} role="region" aria-label={`${caption}, scroll for all columns`}><table className="admin-table"><caption>{caption}</caption><thead><tr><th scope="col">Path</th><th scope="col">Access</th><th scope="col">Function</th></tr></thead><tbody>{entries.map(([path, access, description]) => <tr key={`${path}-${description}`}><th scope="row"><code>{path}</code></th><td>{access}</td><td>{description}</td></tr>)}</tbody></table></div>)}
        </Disclosure>
      </div>
    </section>
    <footer className="admin-dashboard-footer"><span>Generated {formatTime(data.generatedAt)} IST</span><span>Server-authorized · no-store · no credentials rendered</span></footer>
  </div>;
}
