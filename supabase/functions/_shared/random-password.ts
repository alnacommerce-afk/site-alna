// Excludes visually ambiguous characters (0/O, 1/l/I) since this is read off an email and typed
// back in by hand.
const CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

export function randomPassword(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}

// Numeric-only variant for the account password sent in payment_confirmed — easier to read and
// type on a phone than a mixed-case string.
export function randomDigits(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => String(b % 10)).join("");
}
