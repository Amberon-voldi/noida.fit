import type { Event } from "@/types/event";
import type { ParticipationStatus } from "@/types/platform";
import type { AccountParticipation } from "@/lib/participation";
import { eventTimestamp } from "@/components/discovery/filter";

export interface PassportEntry {
  key: string;
  title: string;
  occurredAt: string;
  status: ParticipationStatus;
  event?: Event;
}

/** Build the private view from already-authorized records, without new reads or invented attendance. */
export function accountRecords(participation: AccountParticipation, events: Event[], upcomingEvents: Event[]) {
  const eventsById = new Map(events.map(event => [event.id, event]));
  const upcomingIds = new Set(upcomingEvents.map(event => event.id));
  const rsvps = participation.rsvps
    .filter(item => item.status === "confirmed" && upcomingIds.has(item.eventId))
    .map(rsvp => ({ rsvp, event: eventsById.get(rsvp.eventId) }))
    .sort((a, b) => (a.event ? eventTimestamp(a.event) : Infinity) - (b.event ? eventTimestamp(b.event) : Infinity));
  const history: PassportEntry[] = participation.participations.map(item => ({
    key: `participation-${item.id}`, title: item.title, occurredAt: item.occurredAt, status: item.status,
    event: item.eventId ? eventsById.get(item.eventId) : undefined,
  }));
  const recordedEvents = new Set(participation.participations.filter(item => item.status === "verified").map(item => item.eventId));
  for (const checkin of participation.checkins) {
    if (!recordedEvents.has(checkin.eventId)) history.push({
      key: `checkin-${checkin.id}`, title: eventsById.get(checkin.eventId)?.title || "Event check-in",
      occurredAt: checkin.timestamp, status: "verified", event: eventsById.get(checkin.eventId),
    });
  }
  history.sort((a, b) => (Date.parse(b.occurredAt) || 0) - (Date.parse(a.occurredAt) || 0));
  return { rsvps, history };
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
export function accountDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? dateFormatter.format(date) : "Date unavailable";
}

export function passportDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return { day: "—", month: "Date unavailable", year: "" };
  const parts = dateFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value || "";
  return { day: part("day"), month: part("month"), year: part("year") };
}
