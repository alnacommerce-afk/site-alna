// Single source for the return policy that Meta Commerce and Google Merchant read as structured data
// (schema.org MerchantReturnPolicy). It must always match the text of the policy page.
export const RETURN_POLICY_URL = "https://store.alna.sale/politica-de-troca-e-devolucao";

export const RETURN_POLICY = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "BR",
  // 7 calendar days from delivery (CDC art. 49), returned by mail at no cost, full refund.
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 7,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/FreeReturn",
  refundType: "https://schema.org/FullRefund",
  merchantReturnLink: RETURN_POLICY_URL,
} as const;
