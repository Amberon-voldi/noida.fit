/** Browser-safe QR framing; public profile links and retired event URLs are never check-in credentials. */
export const PARTICIPANT_QR_PREFIX = "NF-CHECKIN:";
export function participantQrValue(token: string): string {
  return `${PARTICIPANT_QR_PREFIX}${token}`;
}
export function participantTokenFromQr(value: string): string {
  const input = value.trim();
  const token = input.startsWith(PARTICIPANT_QR_PREFIX) ? input.slice(PARTICIPANT_QR_PREFIX.length) : input;
  if (token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new Error("Scan the participant’s check-in QR from /check-in, not their public-profile QR or an old event code.");
  }
  return token;
}

/** A guest pass (/pass/<id>) shows this QR: a guest who claimed a gift without an account has no .fit ID. */
export const GUEST_QR_PREFIX = "NF-GUEST:";
export function guestQrValue(passId: string): string {
  return `${GUEST_QR_PREFIX}${passId}`;
}
/** What the check-in desk scanned or pasted: a member's .fit ID check-in QR, or a guest pass. */
export function checkInCodeFromQr(value: string): { token: string } | { guestPass: string } {
  const input = value.trim();
  if (!input.startsWith(GUEST_QR_PREFIX)) return { token: participantTokenFromQr(input) };
  const guestPass = input.slice(GUEST_QR_PREFIX.length);
  if (!/^p[A-Za-z0-9_-]{24}$/.test(guestPass)) throw new Error("This guest pass QR didn’t read cleanly. Scan it again, or check the guest in from the guest list.");
  return { guestPass };
}
