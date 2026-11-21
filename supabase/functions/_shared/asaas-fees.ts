// Taxas vigentes da conta Asaas, lidas pela API (GET /v3/myAccount/fees/). Somente leitura.
// Cache de 1 hora por instância da função; se a API falhar, usa os valores de contingência
// (os últimos conhecidos, promocionais até 14/12/2026) e marca isso no retorno.

export const ASAAS_API = "https://api.asaas.com/v3";

export type CardTier = { max: number; pct: number };

export type AccountRates = {
  source: "api" | "fallback";
  promoValid: boolean;
  discountExpiration: string | null;
  card: {
    tiers: CardTier[]; // pct em fração (0.0199 = 1,99%)
    fixedCents: number; // taxa fixa por cobrança (49 = R$ 0,49)
  };
  pix: { fixedCents: number };
  fetchedAt: string;
};

// Contingência: valores promocionais conhecidos (conta do dono). Só é usado se a API não responder.
const FALLBACK_CARD_TIERS: CardTier[] = [
  { max: 1, pct: 0.0199 },
  { max: 6, pct: 0.0249 },
  { max: 12, pct: 0.0299 },
];
const FALLBACK_CARD_FIXED = 49;
const FALLBACK_PIX_FIXED = 99;

let cache: { at: number; rates: AccountRates } | null = null;
const CACHE_MS = 60 * 60 * 1000;

function toCents(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
function toFraction(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n / 100 : null;
}

function isPromoValid(expiration: string | null | undefined): boolean {
  if (!expiration) return false;
  const end = new Date(`${expiration}T23:59:59-03:00`).getTime();
  return Number.isFinite(end) && Date.now() <= end;
}

// Converte a resposta da API. Usa a taxa promocional enquanto a data de validade não passou.
export function parseFees(json: any): AccountRates {
  const cc = json?.payment?.creditCard ?? {};
  const pix = json?.payment?.pix ?? {};
  const expiration: string | null = cc.discountExpiration ?? null;
  const promoValid = isPromoValid(expiration);
  const pick = (std: unknown, promo: unknown) => (promoValid && promo != null ? promo : std);

  const tiers: CardTier[] = [
    { max: 1, pct: toFraction(pick(cc.oneInstallmentPercentage, cc.discountOneInstallmentPercentage)) ?? NaN },
    { max: 6, pct: toFraction(pick(cc.upToSixInstallmentsPercentage, cc.discountUpToSixInstallmentsPercentage)) ?? NaN },
    { max: 12, pct: toFraction(pick(cc.upToTwelveInstallmentsPercentage, cc.discountUpToTwelveInstallmentsPercentage)) ?? NaN },
  ];
  const cardFixed = toCents(cc.operationValue) ?? FALLBACK_CARD_FIXED;
  const pixPromoOk = isPromoValid(pix.discountExpiration ?? null);
  const pixFixed = toCents(pixPromoOk && pix.fixedFeeValueWithDiscount != null ? pix.fixedFeeValueWithDiscount : pix.fixedFeeValue) ?? FALLBACK_PIX_FIXED;

  if (tiers.some((t) => !Number.isFinite(t.pct))) throw new Error("taxas de cartão incompletas na resposta da API");
  return {
    source: "api",
    promoValid,
    discountExpiration: expiration,
    card: { tiers, fixedCents: cardFixed },
    pix: { fixedCents: pixFixed },
    fetchedAt: new Date().toISOString(),
  };
}

function fallbackRates(): AccountRates {
  return {
    source: "fallback",
    promoValid: true,
    discountExpiration: "2026-12-14",
    card: { tiers: FALLBACK_CARD_TIERS, fixedCents: FALLBACK_CARD_FIXED },
    pix: { fixedCents: FALLBACK_PIX_FIXED },
    fetchedAt: new Date().toISOString(),
  };
}

export async function getAccountRates(asaasKey: string): Promise<AccountRates> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rates;
  try {
    const resp = await fetch(`${ASAAS_API}/myAccount/fees/`, {
      headers: { access_token: asaasKey, "User-Agent": "ALNA (noreply@alna.sale)" },
    });
    if (!resp.ok) throw new Error(`Asaas fees HTTP ${resp.status}`);
    const rates = parseFees(await resp.json());
    cache = { at: Date.now(), rates };
    return rates;
  } catch (err) {
    console.error("[asaas-fees] usando contingência:", err);
    return fallbackRates();
  }
}
