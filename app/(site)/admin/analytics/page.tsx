import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/auth";
import { getSalesAnalytics, type DaySales, type EventSales, type SalesBreakdown } from "@/lib/admin/analytics";
import { formatDate } from "@/lib/config";
import { formatInr } from "@/lib/pricing";
import { getCommunities } from "@/lib/data";
import { pruneSeen, readMetrics, type MetricTotals } from "@/lib/metrics";
import { MetricsSetupButton } from "@/components/admin/MetricsSetupButton";
import { SettlePaymentForm } from "@/components/admin/SettlePaymentForm";

export const metadata: Metadata = { title: "Admin · Analytics", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ event?: string | string[] }> };

const percent = (part: number, whole: number) => whole ? `${Math.round((part / whole) * 100)}%` : "—";

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div><p className="admin-metric-label">{label}</p><p className="admin-metric-value">{value}</p>{note && <p className="admin-note">{note}</p>}</div>;
}

/** Paid tickets per day (IST), one bar a day; hover a bar for its tickets and revenue. */
function DailyChart({ days }: { days: DaySales[] }) {
  const width = 640, height = 160, top = 12, bottom = 24, gap = 2;
  const max = Math.max(1, ...days.map(day => day.tickets));
  const slot = width / days.length;
  const bar = Math.max(4, slot - gap * 2);
  const plot = height - top - bottom;
  return <figure className="admin-panel" style={{ margin: 0 }}>
    <figcaption className="admin-note" style={{ marginBottom: 8 }}>Paid tickets per day, last {days.length} days (IST)</figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Paid tickets per day: ${days.map(day => `${day.date} ${day.tickets}`).join(", ")}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <line x1={0} x2={width} y1={top + plot} y2={top + plot} stroke="var(--border-subtle)" strokeWidth={1} />
      <text x={0} y={top - 2} fontSize={10} fill="var(--text-secondary)">{max}</text>
      {days.map((day, index) => {
        const h = day.tickets ? Math.max(3, (day.tickets / max) * plot) : 0;
        const x = index * slot + (slot - bar) / 2;
        const label = new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
        return <g key={day.date}>
          <title>{`${label}: ${day.tickets} ticket${day.tickets === 1 ? "" : "s"} · ${formatInr(day.revenue)}`}</title>
          <rect x={index * slot} y={top} width={slot} height={plot} fill="transparent" />
          {h > 0 && <rect x={x} y={top + plot - h} width={bar} height={h} rx={Math.min(4, bar / 2)} fill="var(--accent-velocity)" />}
          {(index === 0 || index === days.length - 1 || index % 7 === 0) && <text x={index * slot + slot / 2} y={height - 6} fontSize={10} textAnchor="middle" fill="var(--text-secondary)">{label}</text>}
        </g>;
      })}
    </svg>
  </figure>;
}

function Breakdown({ title, rows, empty, total }: { title: string; rows: SalesBreakdown[]; empty: string; total: number }) {
  return <section className="admin-section" aria-label={title}>
    <div className="admin-section-heading"><h2>{title}</h2></div>
    {rows.length ? <div className="admin-table-wrap"><table className="admin-table" style={{ minWidth: 420 }}>
      <thead><tr><th scope="col">{title === "Discount codes" ? "Code" : "Ticket type"}</th><th scope="col">Tickets</th><th scope="col">Revenue</th><th scope="col">Share of revenue</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.key}><th scope="row">{row.label}</th><td>{row.tickets}</td><td>{formatInr(row.revenue)}</td><td>{percent(row.revenue, total)}</td></tr>)}</tbody>
    </table></div> : <p className="admin-note">{empty}</p>}
  </section>;
}

const METRIC_DAYS = 30;

/** Each step's people, as a bar against the first step, with the share kept from the step before. */
function Funnel({ steps }: { steps: Array<{ label: string; people: number; note?: string }> }) {
  const top = Math.max(1, steps[0]?.people ?? 0);
  return <section className="admin-section" aria-label="Steps">
    <div className="admin-section-heading"><h2>Steps, last {METRIC_DAYS} days</h2><span className="admin-note">People, counted once a day per page</span></div>
    <ol className="admin-panel" style={{ margin: 0, listStyle: "none", display: "grid", gap: 12 }}>
      {steps.map((step, index) => <li key={step.label}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: ".8125rem" }}>
          <span><strong>{step.label}</strong>{step.note && <span className="admin-note"> · {step.note}</span>}</span>
          <span><strong>{step.people}</strong>{index > 0 && <span className="admin-note"> · {percent(step.people, steps[index - 1].people)} of previous</span>}</span>
        </div>
        <div aria-hidden="true" style={{ marginTop: 6, height: 10, borderRadius: 999, background: "var(--surface-elevated)" }}>
          <div style={{ width: `${Math.min(100, (step.people / top) * 100)}%`, minWidth: step.people ? 4 : 0, height: "100%", borderRadius: 999, background: "var(--accent-velocity)" }} />
        </div>
      </li>)}
    </ol>
  </section>;
}

function EventDetail({ event, metrics }: { event: EventSales; metrics?: MetricTotals | null }) {
  const m = metrics ?? undefined;
  return <>
    <section className="admin-metric-strip" aria-label={`${event.title} sales`}>
      <Metric label="Revenue" value={formatInr(event.revenue)} note={`${event.paidTickets} paid ticket${event.paidTickets === 1 ? "" : "s"}`} />
      <Metric label="Going" value={event.capacity ? `${event.going} / ${event.capacity}` : String(event.going)} note={`${event.gifts} gifted · ${event.freeRsvps} free RSVP${event.freeRsvps === 1 ? "" : "s"}`} />
      {event.paid && <Metric label="Checkout → paid" value={percent(event.paidOnline, event.checkouts)} note={`${event.checkouts} checkouts · ${event.payingNow} paying now · ${event.abandoned} not completed`} />}
      <Metric label="Checked in" value={String(event.checkedIn)} note={event.going ? `${percent(event.checkedIn, event.going)} of guests` : "No guests yet"} />
    </section>
    {metrics !== null && <Funnel steps={event.paid ? [
      { label: "Visited the page", people: m?.view_people ?? 0, note: `${m?.view ?? 0} views` },
      { label: "Tapped Get ticket", people: m?.cta_people ?? 0, note: `${m?.cta ?? 0} taps` },
      { label: "Tapped Pay", people: m?.pay_people ?? 0, note: `${m?.pay ?? 0} taps` },
      { label: "Paid", people: event.paidTickets },
    ] : [
      { label: "Visited the page", people: m?.view_people ?? 0, note: `${m?.view ?? 0} views` },
      { label: "Tapped RSVP", people: m?.cta_people ?? 0, note: `${m?.cta ?? 0} taps` },
      { label: "Going", people: event.going },
    ]} />}
    {event.paid && <DailyChart days={event.daily} />}
    {event.paid && <Breakdown title="Ticket types" rows={event.tiers} empty="No paid tickets yet." total={event.revenue} />}
    {event.paid && <Breakdown title="Discount codes" rows={event.coupons} empty="No paid tickets used a discount code." total={event.revenue} />}
  </>;
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const user = await requireAdminPage("/admin/analytics");
  const { event: selectedId } = await searchParams;
  const [data, eventMetrics, clubMetrics, clubs] = await Promise.all([getSalesAnalytics(user.id), readMetrics("event", METRIC_DAYS), readMetrics("community", METRIC_DAYS), getCommunities()]);
  void pruneSeen();
  const metricsOn = eventMetrics !== null && clubMetrics !== null;
  const today = new Date(Date.parse(data.generatedAt) + 330 * 60_000).toISOString().slice(0, 10);
  // Default: the soonest upcoming paid event, else the most recent one.
  const selected = data.events.find(event => event.id === selectedId)
    ?? [...data.events].filter(event => event.paid && event.date >= today && event.status === "published").sort((a, b) => a.date.localeCompare(b.date))[0]
    ?? data.events[0];

  return <div className="admin-page">
    <p className="eyebrow">Analytics</p>
    <h1 className="admin-title">Sales & traffic</h1>
    <p className="admin-intro">Live from bookings and check-ins. Demo listings are left out.</p>

    <section className="admin-metric-strip" aria-label="All events">
      <Metric label="Total revenue" value={formatInr(data.totals.revenue)} note={`${data.totals.paidTickets} paid tickets`} />
      <Metric label="Going, all events" value={String(data.totals.going)} note={`${data.totals.gifts} gifted`} />
      <Metric label="Paying now" value={String(data.totals.payingNow)} note="Seats held at checkout" />
      <Metric label="Checked in" value={String(data.totals.checkedIn)} />
    </section>

    <section className="admin-section" aria-labelledby="settle-heading">
      <div className="admin-section-heading"><h2 id="settle-heading">Paid but no ticket?</h2></div>
      <SettlePaymentForm />
    </section>

    <section className="admin-section" aria-labelledby="by-event-heading">
      <div className="admin-section-heading"><h2 id="by-event-heading">By event</h2></div>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th scope="col">Event</th><th scope="col">Date</th><th scope="col">Visitors ({METRIC_DAYS}d)</th><th scope="col">Going</th><th scope="col">Paid</th><th scope="col">Revenue</th><th scope="col">Gifts</th><th scope="col">Checked in</th></tr></thead>
        <tbody>{data.events.map(event => <tr key={event.id} aria-current={event.id === selected?.id ? "true" : undefined}>
          <th scope="row"><Link href={`/admin/analytics?event=${encodeURIComponent(event.id)}`} className="admin-text-link">{event.title}</Link>{event.status !== "published" && <span className="admin-note"> · {event.status}</span>}</th>
          <td>{formatDate(event.date)}</td>
          <td>{metricsOn ? eventMetrics.get(event.id)?.view_people ?? 0 : "—"}</td>
          <td>{event.capacity ? `${event.going}/${event.capacity}` : event.going}</td>
          <td>{event.paid ? event.paidTickets : "Free"}</td>
          <td>{event.paid ? formatInr(event.revenue) : "—"}</td>
          <td>{event.gifts}</td>
          <td>{event.checkedIn}</td>
        </tr>)}</tbody>
      </table></div>
    </section>

    {selected && <section className="admin-section" aria-labelledby="event-heading">
      <div className="admin-section-heading"><h2 id="event-heading">{selected.title}</h2><Link href={`/event/${selected.slug}`} className="admin-text-link">Event page <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
      <EventDetail event={selected} metrics={metricsOn ? eventMetrics.get(selected.id) : null} />
    </section>}

    <section className="admin-section" aria-labelledby="clubs-heading">
      <div className="admin-section-heading"><h2 id="clubs-heading">Club pages, last {METRIC_DAYS} days</h2><span className="admin-note">Cookie-free, counted on this site</span></div>
      {metricsOn ? <div className="admin-table-wrap"><table className="admin-table" style={{ minWidth: 520 }}>
        <thead><tr><th scope="col">Club</th><th scope="col">Visitors</th><th scope="col">Views</th><th scope="col">Tapped Follow</th><th scope="col">Follow rate</th></tr></thead>
        <tbody>{clubs.filter(club => !club.demo).map(club => ({ club, m: clubMetrics.get(club.id) })).sort((a, b) => (b.m?.view_people ?? 0) - (a.m?.view_people ?? 0)).map(({ club, m }) => <tr key={club.id}>
          <th scope="row"><Link href={`/community/${club.slug}`} className="admin-text-link">{club.name}</Link></th>
          <td>{m?.view_people ?? 0}</td><td>{m?.view ?? 0}</td><td>{m?.cta_people ?? 0}</td><td>{percent(m?.cta_people ?? 0, m?.view_people ?? 0)}</td>
        </tr>)}</tbody>
      </table></div> : <div className="admin-panel"><p className="admin-note" style={{ marginBottom: 12 }}>Page analytics isn’t on yet. It counts event and club page visitors and taps on Get ticket, RSVP, Pay and Follow, without cookies.</p><MetricsSetupButton /></div>}
    </section>
  </div>;
}
