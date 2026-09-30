const INDIA_OFFSET_MINUTES = 330;

function parseTime(value: string): { hours: number; minutes: number } {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) throw new Error("Invalid event time");
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (hours < 1 || hours > 12 || minutes > 59) throw new Error("Invalid event time");
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}

/** Parse the product's Asia/Kolkata wall-clock event fields without using browser TZ. */
export function indiaDateTime(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid event date");
  const [year, month, day] = date.split("-").map(Number);
  const midnight = new Date(Date.UTC(year, month - 1, day));
  if (midnight.toISOString().slice(0, 10) !== date) throw new Error("Invalid event date");
  const { hours, minutes } = parseTime(time);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes) - INDIA_OFFSET_MINUTES * 60_000);
}

function icsDate(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getUTCFullYear()}${pad(value.getUTCMonth() + 1)}${pad(value.getUTCDate())}T${pad(value.getUTCHours())}${pad(value.getUTCMinutes())}${pad(value.getUTCSeconds())}Z`;
}

export function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r\n|\r|\n/g, "\\n");
}

/** RFC 5545 lines are at most 75 UTF-8 octets; fold without splitting code points. */
export function foldIcsLine(line: string): string {
  let result = ""; let octets = 0;
  const encoder = new TextEncoder();
  for (const char of line) {
    const length = encoder.encode(char).length;
    if (octets + length > 75) { result += "\r\n "; octets = 1; }
    result += char; octets += length;
  }
  return result;
}

export interface CalendarEventInput {
  eventId: string;
  eventSlug: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
  communityName?: string;
}

export function createIcs(input: CalendarEventInput, now = new Date()): string {
  const start = indiaDateTime(input.date, input.startTime);
  const end = indiaDateTime(input.date, input.endTime);
  if (end < start) end.setUTCDate(end.getUTCDate() + 1);
  if (end.getTime() === start.getTime()) throw new Error("Event duration must be positive");
  const description = `${input.communityName ? `${input.communityName} · ` : ""}${input.venueName}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "PRODID:-//NOIDA.FIT//Participation//EN",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(input.eventId)}@noida.fit`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    `LOCATION:${escapeIcs(input.venueName)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].map(foldIcsLine).join("\r\n");
}
