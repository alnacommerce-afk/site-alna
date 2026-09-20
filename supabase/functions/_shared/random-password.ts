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

// Account passwords are 12 characters (54^12, about 2^69 combinations). Every call draws a brand new
// random value, so each user gets their own password. Coupon and referral codes pass a shorter length.
export function randomPassword(length = 12): string {
  return Array.from({ length }, () => CHARSET[randomIndex(CHARSET.length)]).join("");
}
