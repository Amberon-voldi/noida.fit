import type { OrganizerAttendee } from "@/types/organizer";
import { formatInr } from "@/lib/pricing";

/** What kind of spot a guest holds, in the organizer's words. */
export function guestTicketLabel(attendee: OrganizerAttendee): string {
  if (attendee.gift) return `${attendee.gift.label ? `Gift (${attendee.gift.label})` : "Gift"}${attendee.guest ? ", guest pass" : ""}`;
  if (attendee.ticket) return `${formatInr(attendee.ticket.amount)} ${attendee.ticket.paid ? "paid" : "due"}`;
  return "Free";
}

/** One CSV cell. Names are typed by members, so a leading = + - @ (or tab/CR) is neutralised: spreadsheets would run it as a formula. */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** The guest list as CSV: names, spots, tickets and check-in times only. No contact details or account IDs. */
export function guestListCsv(attendees: OrganizerAttendee[], timeZone = "Asia/Kolkata"): string {
  const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone });
  const rows = [["Name", "Spot", "Ticket", "Checked in"], ...attendees.map(attendee => [
    attendee.displayName,
    attendee.seatNumber === undefined ? "" : String(attendee.seatNumber),
    guestTicketLabel(attendee),
    attendee.checkInStatus === "checked_in" ? (attendee.checkedInAt ? time.format(new Date(attendee.checkedInAt)) : "Yes") : "",
  ])];
  return `${rows.map(row => row.map(cell).join(",")).join("\r\n")}\r\n`;
}
