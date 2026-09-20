// Excludes visually ambiguous characters (0/O, 1/l/I) since this is read off an email and typed
// back in by hand.
const CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

// Uniform random index in [0, max). A plain `byte % max` favours the first few values whenever 256 is
// not a multiple of `max`; discarding the bytes above the largest multiple removes that bias.
function randomIndex(max: number): number {
  const limit = 256 - (256 % max);
  const buf = new Uint8Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

export function randomPassword(length = 10): string {
  return Array.from({ length }, () => CHARSET[randomIndex(CHARSET.length)]).join("");
}

// Numeric-only variant for the account password sent in payment_confirmed — easier to read and
// type on a phone than a mixed-case string. 10 digits by default.
export function randomDigits(length = 10): string {
  return Array.from({ length }, () => String(randomIndex(10))).join("");
}
