import Link from "next/link";
import { Check, Clock3, Link2, MapPin, PencilLine } from "lucide-react";
import { accountDate, passportDate, type PassportEntry } from "./account-data";

interface ParticipationPassportProps {
  entries: PassportEntry[];
  variant?: "preview" | "history";
}

const statusInfo = {
  verified: { label: "Organizer verified", Icon: Check },
  connected: { label: "Connected service", Icon: Link2 },
  self_reported: { label: "Self-reported · not verified", Icon: PencilLine },
  pending: { label: "Pending verification", Icon: Clock3 },
} as const;

/** Private attendance presentation only. Never included on public profile routes. */
export function ParticipationPassport({ entries, variant = "preview" }: ParticipationPassportProps) {
  return (
    <ol className={`participation-passport participation-passport-${variant}`} aria-label={variant === "preview" ? "Recent participation records" : "All participation records"}>
      {entries.map(item => {
        const date = passportDate(item.occurredAt);
        const { label, Icon } = statusInfo[item.status];
        return <li key={item.key} className="passport-entry" data-status={item.status}>
          <div className="passport-date" aria-hidden="true"><span>{date.month}</span><strong>{date.day}</strong><span>{date.year}</span></div>
          <div className="passport-entry-content">
            <p className="passport-entry-status"><Icon size={14} aria-hidden="true" />{label}</p>
            {item.event ? <Link href={`/event/${item.event.slug}`} className="passport-entry-title">{item.title}</Link> : <p className="passport-entry-title">{item.title}</p>}
            <p className="passport-entry-meta">{Number.isFinite(Date.parse(item.occurredAt)) ? <time dateTime={item.occurredAt}>{accountDate(item.occurredAt)}</time> : accountDate(item.occurredAt)}</p>
            {item.event && <p className="passport-entry-meta"><MapPin size={13} aria-hidden="true" />{item.event.venueName}</p>}
          </div>
        </li>;
      })}
    </ol>
  );
}
