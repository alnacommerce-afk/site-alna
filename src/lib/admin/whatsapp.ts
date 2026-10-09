// Builds a wa.me link that opens WhatsApp with the customer's number and a ready message (the admin reviews
// and sends it by hand — nothing is sent automatically).

/** Digits with the Brazilian country code (55) added when it is missing; null if it doesn't look like a phone. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  return null;
}

export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

/** Replaces every {token} in the message with its value (unknown tokens are left empty). */
export function fillMessage(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? "");
}
