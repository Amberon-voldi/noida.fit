/** A 10-digit Indian mobile number from what a member typed (+91, 0, spaces and dashes allowed), or null. */
export function normalizeIndianMobile(value: string): string | null {
  const digits = value.replace(/[\s().-]/g, "").replace(/^(?:\+?91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}
