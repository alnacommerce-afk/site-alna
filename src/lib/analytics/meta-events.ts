// Eventos do Meta Pixel (produto, carrinho, checkout e compra). Só envia se o Pixel já estiver
// carregado (ver meta-pixel.ts). Não carrega nada novo e nunca quebra a página.
// Não envia nome, e-mail, CPF nem endereço do cliente: só ids de produto, nome do produto e valor.

type MetaEventName = "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";

export type MetaEventParams = {
  content_ids?: string[];
  content_name?: string;
  content_type?: "product";
  num_items?: number;
  value?: number;
  currency?: "BRL";
};

type Fbq = (command: "track", event: MetaEventName, params: MetaEventParams) => void;

/** Returns true when the event was handed to the Pixel. */
export function trackMeta(event: MetaEventName, params: MetaEventParams): boolean {
  try {
    const fbq = (window as unknown as { fbq?: Fbq }).fbq;
    if (!fbq) return false;
    fbq("track", event, params);
    return true;
  } catch {
    return false;
  }
}

/** Purchase counts once per order in this browser tab, even if the order page is reopened or refreshed. */
export function trackMetaPurchaseOnce(orderId: string, totalCents: number) {
  const key = `meta_purchase_${orderId}`;
  try {
    if (sessionStorage.getItem(key)) return;
  } catch {
    // Sem sessionStorage (janela privada), segue sem o controle.
  }
  if (!trackMeta("Purchase", { value: totalCents / 100, currency: "BRL" })) return;
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // Ver acima.
  }
}
