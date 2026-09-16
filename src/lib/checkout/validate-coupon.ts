const FUNCTIONS_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1`;

export async function validateCoupon(
  code: string,
): Promise<{ valid: true; code: string; discountPercent: number } | { valid: false; error: string }> {
  try {
    const resp = await fetch(`${FUNCTIONS_URL}/validate-coupon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await resp.json();
    if (json.valid) return { valid: true, code: json.code, discountPercent: json.discountPercent };
    return { valid: false, error: json.error ?? "Cupom inválido." };
  } catch {
    return { valid: false, error: "Não foi possível validar o cupom agora." };
  }
}
