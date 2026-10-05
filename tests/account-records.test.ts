import { test } from "node:test";
import assert from "node:assert/strict";
import { accountDate, accountRecords, passportDate } from "../components/profile/account-data";
import type { AccountParticipation } from "../lib/participation";
import type { Event } from "../types/event";

const event = (id: string, overrides: Partial<Event> = {}): Event => ({
  id, slug: id, title: `Session ${id}`, category: "running", communitySlug: "test-group", communityName: "Test group",
  venueSlug: "test-place", venueName: "Test venue", sector: "Sector 21A", date: "2026-10-10", startTime: "06:00 AM", endTime: "07:00 AM",
  price: "FREE", description: "Synthetic test", featured: false, attendeesCount: 0, ...overrides,
});
const empty = (): AccountParticipation => ({ rsvps: [], savedItems: [], memberships: [], checkins: [], participations: [] });

test("account plans include only confirmed upcoming RSVPs and show the earliest real session first", () => {
  const later = event("later", { startsAt: "2026-10-12T06:00:00+05:30" });
  const earlier = event("earlier");
  const cancelled = event("cancelled");
  const old = event("past");
  const waitlist = event("waitlist");
  const participation = empty();
  participation.rsvps = [later, old, cancelled, waitlist, earlier].map((item, index) => ({
    id: `rsvp-${index}`, userId: "synthetic-user", eventId: item.id, seatNumber: index,
    createdAt: "2026-10-01T00:00:00Z", status: item.id === "cancelled" ? "cancelled" : item.id === "waitlist" ? "waitlist" : "confirmed",
  }));
  const before = structuredClone(participation);
  const { rsvps } = accountRecords(participation, [later, earlier, cancelled, old, waitlist], [later, earlier, cancelled, waitlist]);
  assert.deepEqual(rsvps.map(item => item.event?.id), ["earlier", "later"]);
  assert.deepEqual(participation, before);
});

test("passport keeps verification states distinct and deduplicates a repaired check-in record", () => {
  const participation = empty();
  participation.participations = ["verified", "connected", "self_reported", "pending"].map((status, index) => ({
    id: `p-${index}`, userId: "synthetic-user", eventId: index === 0 ? "recorded" : undefined, activityId: "running", title: `Record ${status}`,
    occurredAt: `2026-10-0${index + 1}T06:00:00+05:30`, source: "test", status: status as "verified" | "connected" | "self_reported" | "pending",
  }));
  participation.checkins = ["recorded", "missing-public-event"].map((eventId, index) => ({ id: `c-${index}`, userId: "synthetic-user", eventId, timestamp: "2026-10-05T06:00:00+05:30", verificationMethod: "organizer_qr" }));
  const { history } = accountRecords(participation, [event("recorded")], []);
  assert.equal(history.length, 5);
  assert.equal(history.filter(item => item.event?.id === "recorded").length, 1);
  assert.equal(history[0].title, "Event check-in");
  assert.equal(history[0].status, "verified");
  assert.equal(history[0].event, undefined);
  assert.deepEqual(history.slice(1).map(item => item.status), ["pending", "self_reported", "connected", "verified"]);
});

test("empty accounts have no invented plans or passport records, and dates use India time", () => {
  assert.deepEqual(accountRecords(empty(), [], []), { rsvps: [], history: [] });
  assert.equal(accountDate("2026-01-01T19:00:00Z"), "2 Jan 2026");
  assert.deepEqual(passportDate("2026-01-01T19:00:00Z"), { day: "2", month: "Jan", year: "2026" });
  assert.equal(accountDate("invalid"), "Date unavailable");
  assert.deepEqual(passportDate("invalid"), { day: "—", month: "Date unavailable", year: "" });
});
