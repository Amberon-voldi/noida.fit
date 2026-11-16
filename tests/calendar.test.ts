import { test } from "node:test";
import assert from "node:assert/strict";
import { indiaDateTime, createIcs, escapeIcs, foldIcsLine } from "../lib/calendar";

test("Kolkata wall time uses +05:30, independent of host/browser timezone",()=>{
  assert.equal(indiaDateTime("2026-10-01","06:00 AM").toISOString(),"2026-10-01T00:30:00.000Z");
  assert.equal(indiaDateTime("2026-10-01","12:00 AM").toISOString(),"2026-09-30T18:30:00.000Z");
  assert.equal(indiaDateTime("2026-10-01","12:00 PM").toISOString(),"2026-10-01T06:30:00.000Z");
});
test("invalid dates and times cannot silently roll over",()=>{
  for(const date of ["2026-02-30","2026-13-01","junk"]) assert.throws(()=>indiaDateTime(date,"06:00 AM"));
  for(const time of ["24:00 PM","00:00 AM","06:60 AM","6 AM"]) assert.throws(()=>indiaDateTime("2026-10-01",time));
});
test("ICS escapes content injection and folds multibyte lines to 75 octets",()=>{
  assert.equal(escapeIcs("one,two;three\\four\r\nEND:VEVENT\rfive"),"one\\,two\\;three\\\\four\\nEND:VEVENT\\nfive");
  const line="SUMMARY:"+"नमस्ते Noida 🏃 ".repeat(30);
  const folded=foldIcsLine(line);
  assert.equal(folded.replace(/\r\n /g,""),line);
  for(const part of folded.split("\r\n")) assert.ok(Buffer.byteLength(part)<=75);
});
test("calendar download includes stable UID and supports a session crossing midnight",()=>{
  const result=createIcs({eventId:"event-1",eventSlug:"run",title:"Night walk",date:"2026-10-01",startTime:"11:00 PM",endTime:"01:00 AM",venueName:"Noida"},new Date("2026-09-01T00:00:00Z"));
  assert.match(result,/DTSTART:20261001T173000Z/);
  assert.match(result,/DTEND:20261001T193000Z/);
  assert.match(result,/UID:event-1@noida.fit/);
  assert.match(result,/END:VCALENDAR\r\n$/);
});
test("the booking countdown counts India calendar days, not 24-hour periods", async () => {
  const { seeYouLabel } = await import("../lib/calendar");
  const at = (iso: string) => Date.parse(iso);
  // 23:00 IST on the 9th: a 06:00 start on the 10th is tomorrow, even though it's only 7 hours away.
  assert.equal(seeYouLabel("2026-11-10", "06:00 AM", at("2026-11-09T17:30:00.000Z")), "See you tomorrow at 06:00 AM");
  assert.equal(seeYouLabel("2026-11-10", "06:00 AM", at("2026-11-10T00:00:00.000Z")), "See you today at 06:00 AM");
  assert.equal(seeYouLabel("2026-11-14", "06:00 AM", at("2026-11-10T04:00:00.000Z")), "See you on Saturday at 06:00 AM");
  assert.equal(seeYouLabel("2026-11-30", "06:00 AM", at("2026-11-10T04:00:00.000Z")), "See you in 20 days");
  assert.equal(seeYouLabel("not-a-date", "06:00 AM"), "See you there");
});
