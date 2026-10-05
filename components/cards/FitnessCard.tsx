"use client";

import Image from "next/image";
import { useId, useState, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { LockKeyhole, MapPin, QrCode, RotateCw } from "lucide-react";
import type { FitnessProfile } from "@/types/user";
import { getProfileUrl } from "@/components/profile/links";
import "./fitness-card.css";

export interface FitnessCardProps {
  user: FitnessProfile;
  className?: string;
  showControls?: boolean;
  /** Public sharing controls, kept outside the card button and hidden for private IDs. */
  actions?: ReactNode;
}

function memberYear(value: string): string {
  const year = new Date(value).getUTCFullYear();
  return Number.isFinite(year) ? String(year) : "—";
}

export function FitnessCard({ user, className = "", showControls = true, actions }: FitnessCardProps) {
  const [flipped, setFlipped] = useState(false);
  const id = useId();
  const isPublic = user.visibility === "public";
  const profileUrl = getProfileUrl(user.slug);
  // Older DTOs expose only eventsAttended. A deliberate privacy null must not
  // fall through to a different total or become an invented zero.
  const verified = user.stats.verifiedActivities === undefined ? user.stats.eventsAttended : user.stats.verifiedActivities;
  const publicActions = isPublic ? actions : null;
  const controlLabel = flipped ? "Show front" : isPublic ? "Show profile QR" : "Card details";
  const toggle = () => setFlipped(value => !value);

  return (
    <div className={`fitness-id-wrap ${className}`} data-fitness-id>
      <button
        type="button"
        id={id}
        onClick={toggle}
        aria-pressed={flipped}
        aria-label={`Fitness ID for ${user.name}. ${flipped ? "Back" : "Front"} of card. ${controlLabel}.`}
        className="fitness-card"
      >
        <span className="fitness-card-body" style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
          <span aria-hidden={flipped} className="fitness-card-face fitness-card-front">
            <span className="fitness-card-grid" aria-hidden="true" />
            <span className="fitness-card-heading">
              <Image src="/images/logo.png" alt="NOIDA.FIT" width={112} height={38} className="fitness-card-logo" />
              <span className="fitness-card-type">Fitness ID</span>
            </span>
            <span className="fitness-card-identity">
              <span className="fitness-card-member">Community member</span>
              <span className="fitness-card-name">{user.name}</span>
              <span className="fitness-card-handle">@{user.slug}</span>
            </span>
            <span className="fitness-card-location">
              <MapPin size={16} aria-hidden="true" />
              <span>{user.city || "Noida & Greater Noida"}</span>
              <span className="fitness-card-visibility">{isPublic ? "Public profile" : "Private profile"}</span>
            </span>
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
          </span>

          <span aria-hidden={!flipped} className="fitness-card-face fitness-card-back" style={{ transform: "rotateY(180deg)" }}>
            <span className="fitness-card-heading">
              <Image src="/images/logo.png" alt="NOIDA.FIT" width={112} height={38} className="fitness-card-logo" />
              <span className="fitness-card-type">{isPublic ? "Profile QR" : "Card details"}</span>
            </span>
            {isPublic ? (
              <span className="fitness-card-profile-qr">
                <span className="fitness-card-qr-wrap">
                  <QRCodeSVG value={profileUrl} size={160} marginSize={4} bgColor="#ffffff" fgColor="#090a0f" role="img" aria-label={`Public profile QR code for @${user.slug}`} />
                </span>
                <span className="fitness-card-qr-purpose"><QrCode size={16} aria-hidden="true" />Scan to open public profile</span>
                <span className="fitness-card-back-handle">@{user.slug}</span>
                <span className="fitness-card-qr-note">A profile link, not an entry or check-in pass.</span>
              </span>
            ) : (
              <span className="fitness-card-private">
                <LockKeyhole size={24} aria-hidden="true" />
                <span className="fitness-card-private-title">Your profile is private</span>
                <span>Only you can see this ID. Public sharing and a profile QR are off until you make your profile public in settings.</span>
              </span>
            )}
            <span className="fitness-card-number">ID · {user.cardNumber}</span>
          </span>
        </span>
      </button>
      {(showControls || publicActions) && (
        <div className={`fitness-card-controls${showControls && publicActions ? " fitness-card-controls-with-actions" : ""}`}>
          {showControls && <button type="button" onClick={toggle} aria-controls={id} aria-pressed={flipped} className="fitness-card-control">{flipped ? <RotateCw size={16} aria-hidden="true" /> : isPublic ? <QrCode size={16} aria-hidden="true" /> : <LockKeyhole size={16} aria-hidden="true" />}{controlLabel}</button>}
          {publicActions}
        </div>
      )}
    </div>
  );
}
