// Melhor Envio's tracking endpoint sends the carrier's "posted_at" as a plain "YYYY-MM-DD HH:MM:SS" with no
// time zone, and it is Brasília time (it matches the carrier's own tracking page; the label dates such as
// "created_at" are UTC). Brazil has had no daylight saving since 2019, so the offset is always -03:00.
export function postedAtToIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  // Already carries a zone (Z or +hh:mm / -hh:mm): leave it alone.
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) return trimmed;
  return `${trimmed.replace(" ", "T")}-03:00`;
}
