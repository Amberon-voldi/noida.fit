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
