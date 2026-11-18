import { indiaDateTime } from "@/lib/calendar";
import { SITE_CONFIG } from "@/lib/config";
import { formatIndianMobile } from "@/lib/phone";
import { formatInr } from "@/lib/pricing";
import type { Event } from "@/types/event";

/** What the spot-confirmed email shows: the session, and the spot the member booked to pay on WhatsApp. */
export interface SpotConfirmedInput {
  event: Pick<Event, "slug" | "title" | "date" | "startTime" | "endTime" | "venueName" | "sector" | "communityName" | "coverImageUrl" | "imageUrl" | "whatToBring">;
  seatNumber?: number;
  /** The name and WhatsApp number the member booked with. */
  name: string;
  phone: string;
  /** Paise due, paid through the link sent on WhatsApp. */
  amount: number;
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** Every value from a member or an organizer is escaped before it goes into the HTML. */
const escape = (value: string) => value.replace(/[&<>"']/g, character => ESCAPES[character]);

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";
const LIME = "#b5f043";
const INK = "#07090d";
const CARD = "#121822";
const LINE = "#253041";
const MUTED = "#9aa4b2";

/**
 * Images in email need an absolute HTTPS address. An upload (/media/<id>) goes as its share version: a
 * small JPEG made to be shown off the site (the original is same-origin only, and often megabytes).
 */
function absoluteImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/media/")) return `${SITE_CONFIG.url}${url}/share`;
  if (url.startsWith("/") && !url.startsWith("//")) return `${SITE_CONFIG.url}${url}`;
  return url.startsWith("https://") ? url : undefined;
}

function sessionTimes(event: SpotConfirmedInput["event"]): { start: Date; end: Date } | null {
  try {
    const start = indiaDateTime(event.date, event.startTime);
    const end = indiaDateTime(event.date, event.endTime);
    if (end <= start) end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  } catch {
    return null;
  }
}

/** A Google Calendar "add event" link, so the session is one tap from the member's calendar. */
function calendarLink(event: SpotConfirmedInput["event"], times: { start: Date; end: Date }): string {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(times.start)}/${stamp(times.end)}`,
    location: `${event.venueName}, ${event.sector}`,
    details: `Your NOIDA.FIT spot. Open your .fit ID at check-in: ${SITE_CONFIG.url}/event/${event.slug}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function detail(label: string, value: string): string {
  return `<td class="nf-stack" valign="top" width="50%" style="padding:0 0 16px;">
    <div style="font-family:${MONO};font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${MUTED};">${label}</div>
    <div style="margin-top:4px;font-family:${SANS};font-size:16px;font-weight:700;line-height:1.35;color:#ffffff;">${value}</div>
  </td>`;
}

/**
 * The email a member gets the moment their spot is confirmed: the ticket, and, before anything else,
 * that the payment details are coming on WhatsApp. Table layout and inline styles, so it holds together
 * in Gmail, Outlook and Apple Mail; it still reads when images are blocked.
 */
export function spotConfirmedEmail({ event, seatNumber, name, phone, amount }: SpotConfirmedInput): { subject: string; preheader: string; html: string } {
  const price = formatInr(amount);
  const number = `+91 ${formatIndianMobile(phone)}`;
  const firstName = name.trim().split(/\s+/)[0] || "there";
  const times = sessionTimes(event);
  const day = times ? new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(times.start) : event.date;
  const eventUrl = `${SITE_CONFIG.url}/event/${encodeURIComponent(event.slug)}`;
  const banner = absoluteImage(event.coverImageUrl ?? event.imageUrl);
  const spot = seatNumber ? `Spot #${seatNumber}` : "Your spot";
  const bring = (event.whatToBring ?? []).filter(Boolean).slice(0, 6);

  const subject = `You’re in! ${spot} confirmed for ${event.title}`;
  const preheader = `Your ${price} payment link is coming on WhatsApp to ${number}. ${day} · ${event.startTime}.`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escape(subject)}</title>
<style>
  @media (max-width:620px) {
    .nf-pad { padding-left:20px !important; padding-right:20px !important; }
    .nf-h1 { font-size:32px !important; }
    .nf-stack { display:block !important; width:100% !important; }
  }
  a { color:${LIME}; }
</style>
</head>
<body style="margin:0;padding:0;background:${INK};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escape(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INK};background-image:radial-gradient(circle at 50% 0%,#1d2b0c 0%,${INK} 55%);">
<tr><td align="center" style="padding:32px 12px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

  <tr><td align="center" style="padding:0 0 30px;">
    <a href="${SITE_CONFIG.url}" style="text-decoration:none;"><img src="${SITE_CONFIG.url}/images/logo.png" width="156" alt="noida.fit" style="display:block;width:156px;max-width:156px;height:auto;border:0;color:#ffffff;font-family:${SANS};font-size:24px;font-weight:800;"></a>
  </td></tr>

  <tr><td align="center" class="nf-pad" style="padding:0 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" valign="middle" width="64" height="64" style="width:64px;height:64px;border-radius:32px;background:${LIME};box-shadow:0 0 0 8px rgba(181,240,67,0.16);font-family:${SANS};font-size:32px;font-weight:900;line-height:64px;color:${INK};">&#10003;</td>
    </tr></table>
    <div style="margin-top:22px;font-family:${MONO};font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${LIME};">Spot confirmed</div>
    <h1 class="nf-h1" style="margin:10px 0 0;font-family:${SANS};font-size:40px;font-weight:900;line-height:1.05;letter-spacing:-1px;color:#ffffff;">You’re in, ${escape(firstName)}! 🎉</h1>
    <p style="margin:14px 0 0;font-family:${SANS};font-size:16px;line-height:1.55;color:#d6dce4;">Congratulations, your spot for <strong style="color:#ffffff;">${escape(event.title)}</strong> is locked in. See you on ${escape(day)} at ${escape(event.startTime)}.</p>
  </td></tr>

  <tr><td style="padding:28px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d2a17;border:1px solid #25d366;border-radius:20px;">
      <tr>
        <td width="68" valign="top" style="padding:20px 0 20px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" width="48" height="48" style="width:48px;height:48px;border-radius:24px;background:#25d366;font-size:24px;line-height:48px;">💬</td></tr></table>
        </td>
        <td valign="top" style="padding:20px 22px 20px 14px;">
          <div style="font-family:${SANS};font-size:18px;font-weight:800;line-height:1.3;color:#ffffff;">Payment details coming on WhatsApp</div>
          <div style="margin-top:6px;font-family:${SANS};font-size:15px;line-height:1.55;color:#cfeedd;">We’ll send your <strong style="color:#ffffff;">${price}</strong> payment link to <strong style="color:#ffffff;white-space:nowrap;">${escape(number)}</strong> on WhatsApp. Keep an eye on your chats and pay through that link.</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding:24px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CARD};border:1px solid ${LINE};border-bottom:0;border-radius:22px 22px 0 0;">
      ${banner ? `<tr><td style="padding:0;line-height:0;"><img src="${escape(banner)}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;max-height:240px;object-fit:cover;border:0;border-radius:22px 22px 0 0;"></td></tr>` : ""}
      <tr><td class="nf-pad" style="padding:24px 28px 8px;">
        ${event.communityName ? `<div style="font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${LIME};">${escape(event.communityName)}</div>` : ""}
        <div style="margin-top:6px;font-family:${SANS};font-size:26px;font-weight:800;line-height:1.15;letter-spacing:-0.4px;color:#ffffff;">${escape(event.title)}</div>
      </td></tr>
      <tr><td class="nf-pad" style="padding:14px 28px 6px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>${detail("Date", escape(day))}${detail("Time · IST", `${escape(event.startTime)} – ${escape(event.endTime)}`)}</tr>
          <tr>${detail("Where", `${escape(event.venueName)}, ${escape(event.sector)}`)}${detail("To pay", `${price} <span style="font-size:13px;font-weight:600;color:#25d366;">via WhatsApp link</span>`)}</tr>
        </table>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${LIME};border-radius:0 0 22px 22px;border-top:2px dashed ${INK};">
      <tr>
        <td class="nf-pad" valign="middle" style="padding:18px 28px 20px;">
          <div style="font-family:${MONO};font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#2a3a0a;">Admit one · ${escape(spot)}</div>
          <div style="margin-top:4px;font-family:${SANS};font-size:20px;font-weight:900;line-height:1.2;color:${INK};">${escape(name)}</div>
        </td>
        <td align="right" valign="middle" style="padding:18px 28px 20px 0;">
          <span style="display:inline-block;padding:7px 12px;border:2px solid ${INK};border-radius:10px;font-family:${MONO};font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${INK};white-space:nowrap;">Confirmed</span>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td align="center" style="padding:30px 0 0;">
    <a href="${eventUrl}" style="display:inline-block;padding:16px 34px;border-radius:999px;background:${LIME};font-family:${SANS};font-size:16px;font-weight:800;color:${INK};text-decoration:none;">View your ticket &rarr;</a>
    ${times ? `<div style="margin-top:16px;font-family:${SANS};font-size:14px;"><a href="${escape(calendarLink(event, times))}" style="color:${LIME};font-weight:700;text-decoration:none;">&#65291; Add to Google Calendar</a></div>` : ""}
  </td></tr>

  <tr><td style="padding:30px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CARD};border:1px solid ${LINE};border-radius:20px;">
      <tr><td class="nf-pad" style="padding:22px 28px;">
        <div style="font-family:${SANS};font-size:17px;font-weight:800;color:#ffffff;">On the day</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
          <tr><td width="30" valign="top" style="padding:0 0 10px;font-family:${MONO};font-size:13px;font-weight:800;color:${LIME};">01</td><td valign="top" style="padding:0 0 10px;font-family:${SANS};font-size:15px;line-height:1.5;color:#d6dce4;">Pay through the link we send on WhatsApp.</td></tr>
          <tr><td width="30" valign="top" style="padding:0 0 10px;font-family:${MONO};font-size:13px;font-weight:800;color:${LIME};">02</td><td valign="top" style="padding:0 0 10px;font-family:${SANS};font-size:15px;line-height:1.5;color:#d6dce4;">Open your <a href="${SITE_CONFIG.url}/account" style="color:${LIME};font-weight:700;text-decoration:none;">.fit ID</a> and flip it to the check-in QR.</td></tr>
          <tr><td width="30" valign="top" style="padding:0;font-family:${MONO};font-size:13px;font-weight:800;color:${LIME};">03</td><td valign="top" style="padding:0;font-family:${SANS};font-size:15px;line-height:1.5;color:#d6dce4;">Show it at the desk at ${escape(event.venueName)}.${bring.length ? ` Bring: ${bring.map(escape).join(", ")}.` : ""}</td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td align="center" style="padding:34px 20px 0;font-family:${SANS};font-size:12px;line-height:1.7;color:#6b7686;">
    You’re getting this because you booked a spot on NOIDA.FIT with this email address.<br>
    <a href="${SITE_CONFIG.url}/refund-policy" style="color:${MUTED};">Refund &amp; cancellation</a> &nbsp;·&nbsp; <a href="${SITE_CONFIG.url}/privacy" style="color:${MUTED};">Privacy</a> &nbsp;·&nbsp; <a href="${SITE_CONFIG.url}/terms" style="color:${MUTED};">Terms</a><br>
    NOIDA.FIT is owned and operated by Ambuj Pandey, a sole proprietor, trading as Dot Fit Network, Noida, Uttar Pradesh 201301, India.
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, preheader, html };
}
