/**
 * When a session stops taking sign-ups: RSVPs, tickets and gift claims alike. Browser-safe, so the server,
 * the session page and the gift page all close at the same moment.
 *
 * - The organizer's own closing time (bookingClosesAt), never later than the end.
 * - Otherwise the start, or the end for a session that takes late sign-ups.
 *
 * The check-in desk is separate: registering a walk-in there follows the late sign-up setting and the
 * check-in window, not this time.
 */
export function bookingCloseTime(start: number, end: number, options: { lateSignup?: boolean; bookingClosesAt?: string } = {}): number {
  const set = Date.parse(options.bookingClosesAt ?? "");
  if (Number.isFinite(set)) return Number.isFinite(end) ? Math.min(set, end) : set;
  return options.lateSignup ? end : start;
}

/** The same, from a session's stored fields. NaN when its schedule is missing. */
export function eventBookingClosesAt(event: { startsAt?: string; endsAt?: string; lateSignup?: boolean; bookingClosesAt?: string }): number {
  return bookingCloseTime(Date.parse(event.startsAt ?? ""), Date.parse(event.endsAt ?? ""), event);
}

/** The editor's <input type="datetime-local"> value, read as India time ("2026-11-29T05:30"), to an ISO instant. */
export function indiaLocalToIso(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined;
  const time = Date.parse(`${value}:00+05:30`);
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
}

/** An ISO instant as the editor's India-time datetime-local value. */
export function isoToIndiaLocal(iso: string | undefined): string {
  const time = Date.parse(iso ?? "");
  return Number.isFinite(time) ? new Date(time + 330 * 60_000).toISOString().slice(0, 16) : "";
}
