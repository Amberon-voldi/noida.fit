"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Globe2, LockKeyhole, MapPin, QrCode, RefreshCw, RotateCw } from "lucide-react";
import type { FitnessProfile } from "@/types/user";
import { getProfileUrl } from "@/components/profile/links";
import { participantQrValue } from "@/lib/check-in-qr";
import { useCheckInPass, type CheckInPassState } from "./useCheckInPass";
import "./fitness-card.css";

export interface FitnessCardProps {
  user: FitnessProfile;
  className?: string;
  showControls?: boolean;
  /** Public sharing controls, kept outside the card button and hidden for private IDs. */
  actions?: ReactNode;
  /** Owner view: the back shows the member's short-lived check-in QR instead of the profile QR. */
  checkIn?: boolean;
  /** Turn the card over once it has appeared, e.g. when opened from a "Check-in QR" action. */
  flipOnMount?: boolean;
}

function memberYear(value: string): string {
  const year = new Date(value).getUTCFullYear();
  return Number.isFinite(year) ? String(year) : "—";
}

const timeFormatter = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** The card's front face. Also used, static, as the account page's card preview. */
export function FitnessCardFront({ user, hidden }: { user: FitnessProfile; hidden?: boolean }) {
  const isPublic = user.visibility === "public";
  // Older DTOs expose only eventsAttended. A deliberate privacy null must not
  // fall through to a different total or become an invented zero.
  const verified = user.stats.verifiedActivities === undefined ? user.stats.eventsAttended : user.stats.verifiedActivities;
  return (
    <span aria-hidden={hidden} className="fitness-card-face fitness-card-front">
      <span className="fitness-card-grid" aria-hidden="true" />
      <span className="fitness-card-heading">
        <Image src="/images/logo.png" alt="NOIDA.FIT" width={112} height={38} className="fitness-card-logo" />
        <span className="fitness-card-type">.fit ID</span>
      </span>
      <span className="fitness-card-identity">
        <span className="fitness-card-member">Community member</span>
        <span className="fitness-card-name">{user.name}</span>
        <span className="fitness-card-handle">@{user.slug}</span>
      </span>
      <span className="fitness-card-footer">
        <span className="fitness-card-facts">
          <span className="fitness-card-fact">
            <span className="fitness-card-value">{verified === null ? "—" : verified}</span>
            <span className="fitness-card-label">Verified sessions{verified === null && <span className="fitness-card-not-shared">Not shared</span>}</span>
          </span>
          <span className="fitness-card-fact">
            <span className="fitness-card-value">{memberYear(user.joinedAt)}</span>
            <span className="fitness-card-label">Member since</span>
          </span>
        </span>
        <span className="fitness-card-location">
          {user.city && <span className="fitness-card-city"><MapPin size={13} aria-hidden="true" /><span>{user.city}</span></span>}
          <span className="fitness-card-visibility">{isPublic ? <Globe2 size={12} aria-hidden="true" /> : <LockKeyhole size={12} aria-hidden="true" />}{isPublic ? "Public profile" : "Private profile"}</span>
        </span>
      </span>
    </span>
  );
}

function CheckInBack({ state }: { state: CheckInPassState }) {
  const ready = state.status === "ready";
  return (
    <span className="fitness-card-qr-layout">
      <span className={`fitness-card-qr-wrap${ready ? "" : " fitness-card-qr-placeholder"}`}>
        {ready
          ? <QRCodeSVG value={participantQrValue(state.pass.token)} size={200} marginSize={4} bgColor="#ffffff" fgColor="#090a0f" role="img" aria-label="Your participant check-in QR code" />
          : <QrCode size={40} aria-hidden="true" />}
      </span>
      <span className="fitness-card-qr-copy">
        <span className="fitness-card-qr-title">Check-in QR</span>
        {state.status === "ready" && <>
          <span className="fitness-card-qr-text">Show this to the organizer at the session.</span>
          <span className="fitness-card-qr-meta">Valid until <time dateTime={state.pass.expiresAt}>{timeFormatter.format(new Date(state.pass.expiresAt))}</time></span>
        </>}
        {(state.status === "idle" || state.status === "loading") && <span className="fitness-card-qr-text" role="status">Getting your QR…</span>}
        {state.status === "expired" && <span className="fitness-card-qr-text" role="status">This QR expired. Refresh it before the organizer scans.</span>}
        {state.status === "unverified" && <span className="fitness-card-qr-text" role="status">Verify your email to unlock check-in. Use the link we sent you.</span>}
        {state.status === "error" && <span className="fitness-card-qr-text" role="status">{state.message}</span>}
      </span>
    </span>
  );
}

export function FitnessCard({ user, className = "", showControls = true, actions, checkIn = false, flipOnMount = false }: FitnessCardProps) {
  const [flipped, setFlipped] = useState(false);
  const id = useId();
  const isPublic = user.visibility === "public";
  const profileUrl = getProfileUrl(user.slug);
  const publicActions = isPublic ? actions : null;
  const pass = useCheckInPass(checkIn && flipped);
  const controlLabel = flipped ? "Show front" : checkIn ? "Show check-in QR" : isPublic ? "Show profile QR" : "Card details";
  const toggle = () => setFlipped(value => !value);
  const canRefresh = checkIn && flipped && (pass.state.status === "expired" || pass.state.status === "error");

  useEffect(() => {
    if (!flipOnMount) return;
    // Let the card land first so the turn reads as a flip, not a jump.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = window.setTimeout(() => setFlipped(true), reduced ? 0 : 420);
    return () => window.clearTimeout(timeout);
  }, [flipOnMount]);

  return (
    <div className={`fitness-id-wrap ${className}`} data-fitness-id>
      <button
        type="button"
        id={id}
        onClick={toggle}
        aria-pressed={flipped}
        aria-label={`.fit ID for ${user.name}. ${flipped ? "Back" : "Front"} of card. ${controlLabel}.`}
        className="fitness-card"
      >
        <span className="fitness-card-body" style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
          <FitnessCardFront user={user} hidden={flipped} />

          <span aria-hidden={!flipped} className="fitness-card-face fitness-card-back" style={{ transform: "rotateY(180deg)" }}>
            {checkIn ? <CheckInBack state={pass.state} /> : isPublic ? (
              <span className="fitness-card-qr-layout fitness-card-profile-qr">
                <span className="fitness-card-qr-wrap">
                  <QRCodeSVG value={profileUrl} size={200} marginSize={4} bgColor="#ffffff" fgColor="#090a0f" role="img" aria-label={`Public profile QR code for @${user.slug}`} />
                </span>
                <span className="fitness-card-qr-copy">
                  <span className="fitness-card-qr-title">Profile QR</span>
                  <span className="fitness-card-qr-text">Scan to open public profile</span>
                  <span className="fitness-card-back-handle">@{user.slug}</span>
                  <span className="fitness-card-qr-meta">A profile link, not an entry or check-in pass.</span>
                </span>
              </span>
            ) : (
              <span className="fitness-card-private">
                <LockKeyhole size={22} aria-hidden="true" />
                <span className="fitness-card-private-title">Your profile is private</span>
                <span>Only you can see this ID. Public sharing and a profile QR are off until you make your profile public in settings.</span>
              </span>
            )}
            <span className="fitness-card-number">ID · {user.cardNumber}</span>
          </span>
        </span>
      </button>
      {(showControls || publicActions || canRefresh) && (
        <div className={`fitness-card-controls${showControls && publicActions ? " fitness-card-controls-with-actions" : ""}`}>
          {showControls && <button type="button" onClick={toggle} aria-controls={id} aria-pressed={flipped} className="fitness-card-control">{flipped ? <RotateCw size={16} aria-hidden="true" /> : checkIn || isPublic ? <QrCode size={16} aria-hidden="true" /> : <LockKeyhole size={16} aria-hidden="true" />}{controlLabel}</button>}
          {publicActions}
          {canRefresh && <button type="button" onClick={() => void pass.refresh()} className="fitness-card-control fitness-card-refresh"><RefreshCw size={16} aria-hidden="true" />Refresh QR</button>}
        </div>
      )}
      {checkIn && flipped && pass.state.status === "ready" && <p className="fitness-card-fallback"><Link href="/check-in">Organizer can’t scan? Use the code instead</Link></p>}
    </div>
  );
}
