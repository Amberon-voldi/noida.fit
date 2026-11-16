"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Gift, LoaderCircle, Minus, Plus, Share2 } from "lucide-react";
import type { GiftLink, OrganizerAttendee } from "@/types/organizer";
import { SITE_CONFIG } from "@/lib/config";

const MAX_SPOTS = 20;
const field = "mt-1.5 min-h-11 w-full min-w-0 rounded-lg border border-border-strong bg-surface-elevated px-3 text-base text-white";
const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const giftUrl = (id: string) => `${SITE_CONFIG.url}/gift/${id}`;

interface Props {
  eventId: string;
  eventTitle: string;
  published: boolean;
  /** Null when gift links aren't switched on for the site. */
  initialLinks: GiftLink[] | null;
  attendees: OrganizerAttendee[];
  /** The ticket price a gift waives, for paid sessions. */
  paidLabel?: string;
}

/** Free spots the organizer hands out: each link admits a set number of people, no payment. */
export function GiftLinks({ eventId, eventTitle, published, initialLinks, attendees, paidLabel }: Props) {
  const router = useRouter();
  const [links, setLinks] = useState(initialLinks ?? []);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [spots, setSpots] = useState(1);
  const [allowGuests, setAllowGuests] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);

  if (initialLinks === null) return <div className="rounded-xl border border-dashed border-border-strong p-6">
    <h2 className="text-lg font-bold text-white">Gift links aren’t switched on yet</h2>
    <p className="mt-1 text-sm text-text-secondary">The NOIDA.FIT team turns them on for the site. Once they do, you can invite guests, creators and partners free from here.</p>
  </div>;

  async function send(url: string, init: RequestInit): Promise<GiftLink | null> {
    const response = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
    const data = await response.json().catch(() => null) as { link?: GiftLink; error?: string } | null;
    if (!response.ok || !data?.link) throw new Error(data?.error || "That didn’t work. Try again.");
    return data.link;
  }

  async function create(form: React.FormEvent): Promise<void> {
    form.preventDefault();
    setPending("create"); setError(null);
    try {
      const link = await send(`/api/organizer/events/${encodeURIComponent(eventId)}/gifts`, { method: "POST", body: JSON.stringify({ link: { label: label.trim() || undefined, note: note.trim() || undefined, spots, allowGuests } }) });
      if (link) { setLinks(current => [link, ...current]); setFresh(link.id); setLabel(""); setNote(""); setSpots(1); }
      // The dashboard's counts come from the server.
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The gift link could not be created.");
    } finally {
      setPending(null);
    }
  }

  async function revoke(id: string): Promise<void> {
    if (confirmRevoke !== id) { setConfirmRevoke(id); window.setTimeout(() => setConfirmRevoke(current => current === id ? null : current), 4000); return; }
    setConfirmRevoke(null); setPending(id); setError(null);
    try {
      const link = await send(`/api/organizer/events/${encodeURIComponent(eventId)}/gifts/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (link) setLinks(current => current.map(item => item.id === id ? link : item));
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The gift link could not be switched off.");
    } finally {
      setPending(null);
    }
  }

  async function copy(id: string): Promise<void> {
    try { await navigator.clipboard.writeText(giftUrl(id)); setCopied(id); window.setTimeout(() => setCopied(current => current === id ? null : current), 2000); } catch { /* The link stays visible to copy by hand. */ }
  }
  async function share(link: GiftLink): Promise<void> {
    if (!navigator.share) { await copy(link.id); return; }
    const text = `${link.label ? `${link.label}, here’s` : "Here’s"} a free spot at ${eventTitle}. Claim it here:`;
    try { await navigator.share({ title: `You’re invited: ${eventTitle}`, text, url: giftUrl(link.id) }); } catch { /* Cancelled. */ }
  }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
    <form onSubmit={create} className="h-fit space-y-4 rounded-2xl border border-border-strong bg-surface p-4 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-white"><Gift size={20} className="text-velocity" aria-hidden="true" />New gift link</h2>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">Invite a creator, partner or friend of the club free{paidLabel ? `: they skip the ${paidLabel} ticket` : ""}. Whoever opens the link claims a confirmed spot, with or without an account: you choose. Gifted spots count towards capacity.</p>
      </div>
      <fieldset disabled={pending === "create"} className="space-y-4">
        <label className="block text-sm font-semibold text-white">Who is it for? <span className="font-normal text-text-secondary">(optional)</span>
          <input value={label} onChange={change => setLabel(change.target.value)} maxLength={120} placeholder="Riya (@riya.runs)" className={field} />
          <span className="mt-1 block text-xs text-text-secondary">Shown on the invite and its link preview.</span>
        </label>
        <label className="block text-sm font-semibold text-white">Note <span className="font-normal text-text-secondary">(optional)</span>
          <textarea value={note} onChange={change => setNote(change.target.value)} maxLength={500} rows={3} placeholder="Would love to have you run with us. Bring a friend for the cool-down coffee!" className={`${field} py-2.5`} />
        </label>
        <div>
          <span id="gift-spots-label" className="block text-sm font-semibold text-white">Spots on this link</span>
          <div className="mt-1.5 flex items-center gap-2" role="group" aria-labelledby="gift-spots-label">
            <button type="button" aria-label="One fewer spot" onClick={() => setSpots(value => Math.max(1, value - 1))} disabled={spots <= 1} className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-strong text-white disabled:opacity-40"><Minus size={16} aria-hidden="true" /></button>
            <output aria-live="polite" className="min-w-12 text-center text-2xl font-extrabold text-white">{spots}</output>
            <button type="button" aria-label="One more spot" onClick={() => setSpots(value => Math.min(MAX_SPOTS, value + 1))} disabled={spots >= MAX_SPOTS} className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-strong text-white disabled:opacity-40"><Plus size={16} aria-hidden="true" /></button>
            <span className="text-xs text-text-secondary">{spots === 1 ? "Just for them" : `They can share it with ${spots - 1} more`}</span>
          </div>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold text-white">How they claim it</legend>
          <div className="mt-1.5 grid gap-2">
            {([
              [true, "No account needed", "They give a name and mobile number and get a guest pass with a QR for the door."],
              [false, "With a NOIDA.FIT account", "They sign in or sign up, and the session counts on their .fit ID."],
            ] as const).map(([value, title, text]) => <label key={title} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${allowGuests === value ? "border-velocity bg-velocity/10" : "border-border-strong"}`}>
              <input type="radio" name="gift-access" checked={allowGuests === value} onChange={() => setAllowGuests(value)} className="mt-1 size-4 shrink-0 accent-velocity" />
              <span className="min-w-0"><span className="block text-sm font-semibold text-white">{title}</span><span className="mt-0.5 block text-xs text-text-secondary">{text}</span></span>
            </label>)}
          </div>
        </fieldset>
      </fieldset>
      <button type="submit" disabled={pending === "create"} className="button-primary w-full">{pending === "create" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Gift className="h-4 w-4" aria-hidden="true" />}Create gift link</button>
      {!published && <p className="text-xs text-text-secondary">This session isn’t published yet. Gift links start working once it is.</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-400/60 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
    </form>

    <section aria-labelledby="gift-list-heading" className="min-w-0">
      <h2 id="gift-list-heading" className="text-xl font-bold text-white">Your gift links</h2>
      {links.length ? <ul className="mt-3 space-y-3">
        {links.map(link => {
          const guests = attendees.filter(attendee => attendee.gift?.linkId === link.id).map(attendee => attendee.guest ? `${attendee.displayName} (guest pass)` : attendee.displayName);
          const usedUp = link.claimed >= link.spots;
          const status = link.status === "revoked" ? "Switched off" : usedUp ? "All claimed" : "Active";
          return <li key={link.id} className={`rounded-xl border bg-surface p-4 ${fresh === link.id ? "border-velocity/70" : "border-border-subtle"} ${link.status === "revoked" ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{link.label || "Anyone with the link"}</p>
                <p className="mt-0.5 text-xs text-text-secondary">{link.claimed} of {link.spots} claimed · {link.allowGuests ? "no account needed" : "account needed"} · made {dateFormatter.format(new Date(link.createdAt))}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status === "Active" ? "bg-velocity/15 text-velocity" : "border border-border-subtle text-text-secondary"}`}>{status}</span>
            </div>
            {link.note && <p className="mt-2 line-clamp-2 text-sm text-text-secondary">“{link.note}”</p>}
            {guests.length > 0 && <p className="mt-2 text-sm text-white"><span className="text-text-secondary">Claimed by </span>{guests.join(", ")}</p>}
            {link.status === "active" && <>
              <p className="mt-3 truncate rounded-lg bg-surface-elevated px-3 py-2 font-mono text-xs text-text-secondary">{giftUrl(link.id)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(link.id)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-sm font-semibold text-white hover:bg-surface-hover">{copied === link.id ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied === link.id ? "Copied" : "Copy link"}</button>
                <button type="button" onClick={() => share(link)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-sm font-semibold text-white hover:bg-surface-hover"><Share2 size={15} aria-hidden="true" />Share</button>
                <a href={`/gift/${link.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-text-secondary hover:text-white"><ExternalLink size={15} aria-hidden="true" />Preview</a>
                <button type="button" onClick={() => revoke(link.id)} disabled={pending === link.id} className={`ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${confirmRevoke === link.id ? "border border-rose-400 bg-rose-500/15 text-rose-200" : "text-text-secondary hover:text-rose-200"}`}>
                  {pending === link.id && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}{confirmRevoke === link.id ? "Tap again to switch off" : "Switch off"}
                </button>
              </div>
            </>}
          </li>;
        })}
      </ul> : <p className="mt-3 rounded-xl border border-dashed border-border-strong p-5 text-sm text-text-secondary">No gift links yet. Create one for each person you’re inviting, so you can see who came.</p>}
      <p className="mt-3 text-xs text-text-secondary">Switching a link off stops new claims. Spots already claimed stay valid.</p>
    </section>
  </div>;
}
