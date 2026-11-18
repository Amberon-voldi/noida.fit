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

// One ink, one accent. Light paper reads the same in every mail app, and dark-mode apps invert it evenly.
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";
const INK = "#0b0f14";
const BODY = "#3f4753";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";
const PAPER = "#f1f2f4";
const LIME = "#b5f043";

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
  return `<td class="nf-stack" valign="top" width="50%" style="padding:0 12px 18px 0;">
    <div style="font-family:${MONO};font-size:10px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${MUTED};">${label}</div>
    <div style="margin-top:5px;font-family:${SANS};font-size:15px;font-weight:700;line-height:1.4;color:${INK};">${value}</div>
  </td>`;
}

function step(number: number, text: string, last = false): string {
  return `<tr>
    <td width="34" valign="top" style="padding:0 0 ${last ? 0 : 14}px;"><div style="width:24px;height:24px;border-radius:12px;background:${INK};font-family:${SANS};font-size:12px;font-weight:800;line-height:24px;text-align:center;color:#ffffff;">${number}</div></td>
    <td valign="top" style="padding:2px 0 ${last ? 0 : 14}px;font-family:${SANS};font-size:15px;line-height:1.5;color:${BODY};">${text}</td>
  </tr>`;
}

/**
 * The email a member gets the moment their spot is confirmed: before anything else, that the payment
 * details are coming on WhatsApp; then the ticket and what to do on the day. Table layout and inline styles
 * so it holds together in Gmail, Outlook and Apple Mail, and still reads with images blocked.
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
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escape(subject)}</title>
<style>
  @media (max-width:620px) {
    .nf-pad { padding-left:22px !important; padding-right:22px !important; }
    .nf-h1 { font-size:30px !important; }
    .nf-stack { display:block !important; width:100% !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAPER};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escape(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAPER}" style="background:${PAPER};">
<tr><td align="center" style="padding:28px 12px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

  <tr><td align="center" style="padding:0 0 20px;">
    <a href="${SITE_CONFIG.url}" style="text-decoration:none;"><img src="${SITE_CONFIG.url}/images/email-logo.png" width="150" height="48" alt="noida.fit" style="display:block;width:150px;height:48px;border:0;font-family:${SANS};font-size:22px;font-weight:800;color:${INK};"></a>
  </td></tr>

  <tr><td>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${LINE};border-radius:20px;">

    <tr><td align="center" class="nf-pad" style="padding:36px 40px 4px;">
      <span style="display:inline-block;padding:7px 14px;border-radius:999px;background:${LIME};font-family:${MONO};font-size:11px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:${INK};">&#10003;&nbsp; Spot confirmed</span>
      <h1 class="nf-h1" style="margin:18px 0 0;font-family:${SANS};font-size:36px;font-weight:900;line-height:1.1;letter-spacing:-0.8px;color:${INK};">You’re in, ${escape(firstName)}! 🎉</h1>
      <p style="margin:12px 0 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${BODY};">Congratulations, your spot for <strong style="color:${INK};">${escape(event.title)}</strong> is locked in. See you on ${escape(day)} at ${escape(event.startTime)}.</p>
    </td></tr>

    <tr><td class="nf-pad" style="padding:28px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${INK}" style="background:${INK};border-radius:16px;">
        <tr>
          <td width="64" valign="top" style="padding:20px 0 20px 20px;">
            <div style="width:44px;height:44px;border-radius:22px;background:${LIME};font-size:22px;line-height:44px;text-align:center;">💬</div>
          </td>
          <td valign="top" style="padding:19px 22px 20px 14px;">
            <div style="font-family:${SANS};font-size:17px;font-weight:800;line-height:1.3;color:#ffffff;">Payment details coming on WhatsApp</div>
            <div style="margin-top:6px;font-family:${SANS};font-size:15px;line-height:1.55;color:#c7ccd4;">We’ll send your <strong style="color:#ffffff;">${price}</strong> payment link to <strong style="color:#ffffff;white-space:nowrap;">${escape(number)}</strong> on WhatsApp. Keep an eye on your chats and pay through that link.</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <tr><td class="nf-pad" style="padding:24px 40px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${LINE};border-radius:16px;">
        ${banner ? `<tr><td style="padding:0;line-height:0;"><img src="${escape(banner)}" width="518" alt="" style="display:block;width:100%;height:auto;border:0;border-radius:15px 15px 0 0;"></td></tr>` : ""}
        <tr><td style="padding:20px 22px 4px;">
          ${event.communityName ? `<div style="font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${MUTED};">${escape(event.communityName)}</div>` : ""}
          <div style="margin-top:4px;font-family:${SANS};font-size:22px;font-weight:800;line-height:1.2;letter-spacing:-0.3px;color:${INK};">${escape(event.title)}</div>
        </td></tr>
        <tr><td style="padding:16px 22px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>${detail("Date", escape(day))}${detail("Time · IST", `${escape(event.startTime)} – ${escape(event.endTime)}`)}</tr>
            <tr>${detail("Where", `${escape(event.venueName)}, ${escape(event.sector)}`)}${detail("To pay", `${price} <span style="font-weight:500;color:${MUTED};">· WhatsApp link</span>`)}</tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 22px;"><div style="border-top:2px dashed ${LINE};font-size:0;line-height:0;">&nbsp;</div></td></tr>
        <tr><td style="padding:16px 22px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle">
              <div style="font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;white-space:nowrap;color:${MUTED};">Admit one · ${escape(spot)}</div>
              <div style="margin-top:3px;font-family:${SANS};font-size:18px;font-weight:800;line-height:1.25;color:${INK};">${escape(name)}</div>
            </td>
            <td align="right" valign="middle" style="padding-left:12px;">
              <span style="display:inline-block;padding:5px 9px;border:2px solid ${INK};border-radius:8px;font-family:${MONO};font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${INK};white-space:nowrap;">Confirmed</span>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>

    <tr><td align="center" class="nf-pad" style="padding:28px 40px 0;">
      <a href="${eventUrl}" style="display:inline-block;padding:15px 32px;border-radius:999px;background:${INK};font-family:${SANS};font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;">View your ticket &rarr;</a>
      ${times ? `<div style="margin-top:14px;font-family:${SANS};font-size:14px;"><a href="${escape(calendarLink(event, times))}" style="color:${INK};font-weight:700;text-decoration:underline;">Add to Google Calendar</a></div>` : ""}
    </td></tr>

    <tr><td class="nf-pad" style="padding:30px 40px 36px;">
      <div style="border-top:1px solid ${LINE};padding-top:24px;font-family:${SANS};font-size:16px;font-weight:800;color:${INK};">On the day</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
        ${step(1, "Pay through the link we send on WhatsApp.")}
        ${step(2, `Open your <a href="${SITE_CONFIG.url}/account" style="color:${INK};font-weight:700;">.fit ID</a> and flip it to the check-in QR.`)}
        ${step(3, `Show it at the desk at ${escape(event.venueName)}.${bring.length ? ` Bring: ${bring.map(escape).join(", ")}.` : ""}`, true)}
      </table>
    </td></tr>

  </table>
  </td></tr>

  <tr><td align="center" style="padding:24px 20px 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${MUTED};">
    You’re getting this because you booked a spot on NOIDA.FIT with this email address.<br>
    <a href="${SITE_CONFIG.url}/refund-policy" style="color:${BODY};">Refund &amp; cancellation</a> &nbsp;·&nbsp; <a href="${SITE_CONFIG.url}/privacy" style="color:${BODY};">Privacy</a> &nbsp;·&nbsp; <a href="${SITE_CONFIG.url}/terms" style="color:${BODY};">Terms</a><br>
    NOIDA.FIT is owned and operated by Ambuj Pandey, a sole proprietor, trading as Dot Fit Network, Noida, Uttar Pradesh 201301, India.
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, preheader, html };
}
