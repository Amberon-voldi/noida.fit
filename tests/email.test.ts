import assert from "node:assert/strict";
import { test } from "node:test";
import { spotConfirmedEmail, type SpotConfirmedInput } from "../lib/email/spot-confirmed";

const event: SpotConfirmedInput["event"] = {
  slug: "bcc-run-rave-2026-11-22", title: "BCC Run & Rave", date: "2026-11-22", startTime: "06:30 AM", endTime: "10:00 AM",
  venueName: "Black Coffee Cafe", sector: "Greater Noida", communityName: "Aawaara Miles", coverImageUrl: "/media/banner123", whatToBring: ["Running shoes", "Water"],
};
const booking = { event, seatNumber: 3, name: "Asha Rao", phone: "9876543210", amount: 9900 };

test("the spot-confirmed email leads with the payment details coming on WhatsApp", () => {
  const email = spotConfirmedEmail(booking);
  assert.equal(email.subject, "You’re in! Spot #3 confirmed for BCC Run & Rave");
  assert.match(email.preheader, /^Your ₹99 payment link is coming on WhatsApp to \+91 98XXXXXXX\. Sunday,? 22 November · 06:30 AM\.$/);
  const whatsapp = email.html.indexOf("Payment details coming on WhatsApp");
  assert.ok(whatsapp > 0 && whatsapp < email.html.indexOf("Admit one"), "the WhatsApp callout comes before the ticket");
  assert.match(email.html, /We’ll send your <strong[^>]*>₹99<\/strong> payment link to <strong[^>]*>\+91 98XXXXXXX<\/strong> on WhatsApp\./);
  assert.match(email.html, /You’re in, Asha! 🎉/);
  assert.match(email.html, /Admit one · Spot #3/);
  assert.match(email.html, /06:30 AM – 10:00 AM/);
  assert.match(email.html, /Bring: Running shoes, Water\./);
  assert.ok(!email.html.includes("undefined"));
});

test("links and images in the email are absolute, and an upload goes as its small share image", () => {
  const { html } = spotConfirmedEmail(booking);
  assert.match(html, /href="https:\/\/noida\.fit\/event\/bcc-run-rave-2026-11-22"/);
  assert.match(html, /src="https:\/\/noida\.fit\/media\/banner123\/share"/);
  assert.match(html, /src="https:\/\/noida\.fit\/images\/email-logo\.png"/, "the logo on its own dark badge reads in light and dark mail");
  // 06:30–10:00 IST is 01:00–04:30 UTC.
  assert.match(html, /calendar\.google\.com\/calendar\/render\?action=TEMPLATE&amp;text=BCC\+Run\+%26\+Rave&amp;dates=20261122T010000Z%2F20261122T043000Z/);
  assert.match(spotConfirmedEmail({ ...booking, event: { ...event, coverImageUrl: "https://images.example.com/run.jpg" } }).html, /src="https:\/\/images\.example\.com\/run\.jpg"/);
  for (const coverImageUrl of ["javascript:alert(1)", "http://insecure.example.com/x.png", "//evil.example.com/x.png"]) {
    assert.ok(!spotConfirmedEmail({ ...booking, event: { ...event, coverImageUrl } }).html.includes(coverImageUrl.replace("//", "")), coverImageUrl);
  }
  // No usable time: no calendar link, and no "undefined" or "Invalid Date" either.
  const untimed = spotConfirmedEmail({ ...booking, event: { ...event, startTime: "", endTime: "" } }).html;
  assert.ok(!untimed.includes("calendar.google.com"));
  assert.ok(!/undefined|Invalid Date/.test(untimed));
});

test("names and titles typed by members and organizers are escaped, never run as HTML", () => {
  const email = spotConfirmedEmail({ ...booking, name: "<img src=x onerror=alert(1)> Rao", event: { ...event, title: "Run <b>&</b> \"Rave\"", communityName: "<script>x</script>" } });
  assert.ok(!email.html.includes("<img src=x"));
  assert.ok(!email.html.includes("<script>x"));
  assert.match(email.html, /Run &lt;b&gt;&amp;&lt;\/b&gt; &quot;Rave&quot;/);
  assert.match(email.html, /&lt;img src=x onerror=alert\(1\)&gt; Rao/);
});
