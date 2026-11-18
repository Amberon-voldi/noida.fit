/** A 10-digit Indian mobile number from what a member typed (+91, 0, spaces and dashes allowed), or null. */
export function normalizeIndianMobile(value: string): string | null {
  const digits = value.replace(/[\s().-]/g, "").replace(/^(?:\+?91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** "98XXXXXXX" for a stored 10-digit mobile number. */
export function formatIndianMobile(phone: string): string {
  return phone.replace(/^(\d{5})(\d{5})$/, "$1 $2");
}
