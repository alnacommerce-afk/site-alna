// A utm_campaign from the URL (e.g. a QR code on a flyer, or a short link for an outdoor ad)
// sticks around in localStorage until checkout sends it along — same pattern as the referral code.
const STORAGE_KEY = "alna_utm_campaign";

export function captureCampaignFromUrl() {
  try {
    const campaign = new URLSearchParams(window.location.search).get("utm_campaign");
    if (campaign) localStorage.setItem(STORAGE_KEY, campaign.trim());
  } catch {
    // ignore write failures (private browsing, quota, etc.)
  }
}

export function getCampaignCode(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
