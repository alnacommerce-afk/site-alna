import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ReactFlow, Background, Controls, Handle, Position, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/marketing/fluxo-email/")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: FluxoEmailPage,
});

type NodeKind = "trigger" | "email" | "wait" | "condition" | "exit";

const KIND_STYLES: Record<NodeKind, CSSProperties> = {
  trigger: { background: "#12294f", color: "#fff", borderColor: "#12294f" },
  email: { background: "#f0fdf4", color: "#12294f", borderColor: "#16a34a" },
  wait: { background: "#f4f4f5", color: "#52525b", borderColor: "#a1a1aa", borderStyle: "dashed" },
  condition: { background: "#fffbeb", color: "#78350f", borderColor: "#fbbf24" },
  exit: { background: "#fef2f2", color: "#991b1b", borderColor: "#fca5a5" },
};

function FlowNode({ data }: { data: { label: string; kind: NodeKind; onClick?: () => void } }) {
  return (
    <div
      onClick={data.onClick}
      style={{
        ...KIND_STYLES[data.kind],
        borderWidth: 2,
        borderRadius: 10,
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 600,
        minWidth: 170,
        textAlign: "center",
        cursor: data.onClick ? "pointer" : "default",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: "#94a3b8" }} />
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ background: "#94a3b8" }} />
      <Handle type="source" id="right" position={Position.Right} style={{ background: "#94a3b8" }} />
    </div>
  );
}

const nodeTypes = { flowNode: FlowNode };

const INSERT_BLOCKS = [
  { label: "Nome do cliente", snippet: "{{nome}}" },
  { label: "Botão", snippet: '<p style="text-align:center;margin:20px 0;"><a href="{{link_pedido}}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;font-weight:bold;text-decoration:none;">Ver meu pedido</a></p>' },
  { label: "Divisor", snippet: '<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />' },
  { label: "Imagem", snippet: '<img src="https://alna.sale/assets/logo-alna.png" alt="" style="max-width:100%;border-radius:8px;margin:16px 0;" />' },
];

const NO_COUPON_VALUE = "__none__";

// Mirrors supabase/functions/_shared/render-template.ts's wrapBranded — so what you preview here
// is exactly what gets sent, even though the real wrapping happens server-side at send time.
function wrapBrandedPreview(innerHtml: string) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; background:#ffffff;">
    <div style="background:#ffffff; padding:20px 24px; text-align:center; border-bottom:4px solid #12294f;">
      <img src="https://alna.sale/assets/logo-alna.png" alt="ALNA" width="140" style="display:inline-block; height:auto; border:0;">
    </div>
    <div style="padding:28px 24px; color:#12294f; font-size:15px; line-height:1.55;">
      ${innerHtml}
    </div>
    <div style="background:#f9fafb; padding:20px 24px; text-align:center; font-size:12px; color:#6b7280;">
      <p style="margin:0;">ALNA — CNPJ 57.135.009/0001-27</p>
      <p style="margin:4px 0 0;">Brusque, SC — Dúvidas? Fale com a gente pelo WhatsApp.</p>
    </div>
  </div>`;
}

function buildFlowGraph(onOpenTemplate: (templateId: string, label: string) => void) {
  const emailNode = (id: string, x: number, y: number, label: string, templateId: string): Node => ({
    id,
    type: "flowNode",
    position: { x, y },
    data: { label: `📧 ${label}`, kind: "email", onClick: () => onOpenTemplate(templateId, label) },
  });
  const plainNode = (id: string, x: number, y: number, label: string, kind: NodeKind): Node => ({
    id,
    type: "flowNode",
    position: { x, y },
    data: { label, kind },
  });

  const nodes: Node[] = [
    // Fluxo 1 — Pedido pendente → confirmação de pagamento (ponto único de entrada; tanto o
    // caminho direto quanto os dois caminhos de recuperação do Fluxo 2 convergem em f1-email2).
    plainNode("f1-trigger", 230, 0, "Pedido pendente criado", "trigger"),
    emailNode("f1-email1", 0, 120, "Pedido recebido", "order_received"),
    plainNode("f1-event", 230, 120, "Evento: pagamento confirmado (webhook Asaas ou cartão aprovado)", "wait"),
    emailNode("f1-email2", 230, 240, "Pagamento confirmado (+ acesso à conta, se novo cliente)", "payment_confirmed"),
    emailNode("f1-referral", 0, 350, "Recompensa de indicação (se o pedido veio de um link)", "referral_reward"),
    emailNode("f1-admin", 0, 240, "Aviso de venda (para o admin)", "admin_new_sale"),
    plainNode("f1-label", 230, 350, "Admin gera a etiqueta no sistema (Admin > Pedidos)", "wait"),
    emailNode("f1-email3", 230, 460, "Pedido preparado (será deixado no ponto de coleta)", "order_prepared"),
    plainNode("f1-post", 230, 570, "Ponto de coleta registra o recebimento (bipa)", "wait"),
    emailNode("f1-email4", 230, 680, "Deixado no ponto de coleta + código e link de rastreio", "order_posted"),

    // Fluxo 2 — Recuperação de carrinho. As duas ramificações "Pagou? → Sim" e o pagamento após a
    // "última chance" apontam de volta para f1-email2 em vez de terminar num "Fim" separado.
    plainNode("f2-wait1", 480, 120, "Espera 10 minutos", "wait"),
    plainNode("f2-cond1", 480, 240, "Pagou?", "condition"),
    emailNode("f2-email1", 480, 350, "Carrinho esperando", "cart_reminder_10min"),
    plainNode("f2-wait2", 480, 460, "Espera 24 horas", "wait"),
    plainNode("f2-cond2", 480, 570, "Pagou?", "condition"),
    emailNode("f2-email2", 480, 680, "Última chance + cupom pessoal (uso único, 7 dias)", "cart_reminder_24h"),
    plainNode("f2-exit", 480, 790, "Sair da lista", "exit"),

    // Fluxo 3 — Pós-compra / NPS / indicação — encadeado direto do Fluxo 1.
    plainNode("f3-trigger", 840, 240, "Transportadora confirma a entrega (conferido a cada 10 min)", "trigger"),
    emailNode("f3-email0", 840, 350, "Pedido chegou!", "delivery_confirmed"),
    plainNode("f3-wait", 840, 460, "Espera 1 dia", "wait"),
    emailNode("f3-email1", 840, 570, "Pesquisa de satisfação (sem promessa de desconto)", "post_purchase_nps"),
    plainNode("f3-click", 840, 680, "Cliente abre a página, dá a nota e clica em Submeter", "wait"),
    plainNode("f3-cond", 840, 790, "Qual foi a nota?", "condition"),
    plainNode("f3-list", 840, 900, "Nota 4 a 10: entra na lista de marketing", "trigger"),
    plainNode("f3-ref", 840, 1010, "Nota 5 a 10: a página mostra o link de indicação (5% por amigo que comprar)", "wait"),
    plainNode("f3-google", 840, 1120, "Nota 6 a 10: aparece o botão \"Nos avalie no Google\"", "wait"),
    plainNode("f3-low", 1090, 790, "Nota 0 a 5: aparece a caixa \"Nos diga o que aconteceu\" (vai para Marketing > NPS)", "wait"),
    plainNode("f3-nomkt", 1090, 900, "Nota 0 a 3: fica fora do marketing", "exit"),
    plainNode("f3-back", 840, 1230, "Botão \"Voltar para a loja\" (store.alna.sale/loja)", "exit"),

    // Fluxo 4 — Marketing: uma campanha a cada 20 dias para toda a lista (notas 4 a 10), com produtos novos + cupom RECOMPRA5%OFF.
    plainNode("f4-trigger", 1260, 0, "Cliente na lista de marketing (nota 4 a 10)", "trigger"),
    plainNode("f4-wait", 1260, 110, "Espera até o próximo ciclo (a cada 20 dias para todos da lista)", "wait"),
    plainNode("f4-pick", 1260, 220, "O sistema escolhe os produtos que entraram nos últimos 20 dias (até 6)", "wait"),
    emailNode("f4-email", 1260, 330, "Novidades + cupom RECOMPRA5%OFF", "weekly_marketing"),
    plainNode("f4-exit", 1260, 440, "Cliente clica em AQUI no rodapé: sai da lista", "exit"),

    // Fluxo 5 — Estoque baixo: a mesma baixa de estoque, seja por venda (débito automático) ou por
    // edição manual do admin, dispara isso — veja handle_stock_quantity_change() na migração
    // 20260928000000.
    plainNode("f5-trigger", 1560, 0, "Estoque de um SKU muda (venda ou edição manual)", "trigger"),
    plainNode("f5-cond", 1560, 110, "Ficou com 10 unidades ou menos?", "condition"),
    emailNode("f5-email", 1560, 220, "Aviso de estoque baixo (para o admin)", "low_stock_alert"),
    plainNode("f5-no", 1800, 110, "Nada acontece", "exit"),
    plainNode("f5-reset-trigger", 1560, 330, "Admin repõe o estoque para mais de 10", "trigger"),
    plainNode("f5-reset-note", 1560, 440, "Alerta reseta — avisa de novo se cair outra vez", "wait"),

    // Fluxo 6 — Produto esgotado / lista de espera "Avise-me quando voltar".
    // Fluxo 7 — Pagamento recusado / estorno (o cliente sempre é avisado, uma vez por mudança de situação).
    plainNode("f7-trigger1", 2520, 0, "Asaas avisa: pagamento recusado ou reprovado (ou pedido pago cancelado)", "trigger"),
    emailNode("f7-email1", 2520, 110, "Pedido cancelado (nada foi cobrado)", "order_cancelled"),
    plainNode("f7-trigger2", 2520, 250, "Asaas avisa: estorno do pagamento", "trigger"),
    emailNode("f7-email2", 2520, 360, "Estorno registrado", "order_refunded"),

    // Fluxo 8 — Aviso de cupom para o admin.
    plainNode("f8-trigger", 2520, 520, "Cupom usado: chega a 5, a 1 ou passa do limite", "trigger"),
    emailNode("f8-email", 2520, 630, "Aviso de cupom (para o admin)", "coupon_alert"),

    plainNode("f6-trigger", 2040, 0, "Estoque de um SKU chega a 0", "trigger"),
    plainNode("f6-ui", 2040, 110, "Página do produto mostra \"Avise-me quando voltar\"", "wait"),
    plainNode("f6-cond", 2040, 220, "Cliente já tem cadastro?", "condition"),
    plainNode("f6-yes", 2040, 330, "Marca a caixa (usa o e-mail da conta)", "wait"),
    plainNode("f6-no", 2280, 330, "Preenche nome + e-mail", "wait"),
    plainNode("f6-list", 2040, 440, "Entra na lista de espera desse SKU", "trigger"),
    plainNode("f6-restock-trigger", 2040, 550, "Admin repõe o estoque (de 0 para mais de 0)", "trigger"),
    emailNode("f6-email", 2040, 660, "Produto voltou! (para cada cliente da lista)", "restock_available"),

    // Fluxo 9 — Carrinho abandonado (cliente que deixou o e-mail na caixa "Salve seu carrinho" ou no checkout).
    // Diferente do Fluxo 2, que cuida de quem já criou o pedido (Pix/cartão) e não pagou.
    plainNode("f9-trigger", 2800, 0, "Cliente deixa o e-mail em \"Salve seu carrinho\" (carrinho ou checkout)", "trigger"),
    plainNode("f9-wait1", 2800, 110, "Espera 1 hora sem movimento no carrinho (nada é enviado das 22h às 8h)", "wait"),
    plainNode("f9-cond1", 2800, 220, "Já comprou ou pediu para sair?", "condition"),
    emailNode("f9-email1", 2800, 330, "Carrinho salvo, sem cupom (itens, total e botão para reabrir o carrinho)", "abandoned_cart_1h"),
    plainNode("f9-wait2", 2800, 440, "Espera 24 horas (contadas do último movimento)", "wait"),
    plainNode("f9-cond2", 2800, 550, "Já comprou ou pediu para sair?", "condition"),
    emailNode("f9-email2", 2800, 660, "Última lembrança + cupom pessoal (uso único, 7 dias; soma até 3 cupons)", "abandoned_cart_24h"),
    plainNode("f9-exit", 2800, 770, "Fim: no máximo 2 lembretes por e-mail a cada 7 dias", "exit"),
    plainNode("f9-stop", 3060, 220, "Comprou, criou o pedido ou clicou em sair: para tudo (Fluxo 1 assume)", "exit"),
  ];

  const edges: Edge[] = [
    { id: "e-f1-1", source: "f1-trigger", target: "f1-email1" },
    { id: "e-f1-2", source: "f1-trigger", target: "f1-event" },
    { id: "e-f1-3", source: "f1-trigger", target: "f2-wait1" },
    { id: "e-f1-4", source: "f1-event", target: "f1-email2" },
    {
      id: "e-f1-5",
      source: "f1-email2",
      target: "f1-referral",
      label: "se tem indicador",
      style: { strokeDasharray: "4 4" },
    },
    { id: "e-f1-6", source: "f1-email2", target: "f1-admin", sourceHandle: "right", style: { strokeDasharray: "4 4" } },
    { id: "e-f1-7", source: "f1-email2", target: "f1-label" },
    { id: "e-f1-8", source: "f1-label", target: "f1-email3" },
    { id: "e-f1-9", source: "f1-email3", target: "f1-post" },
    { id: "e-f1-10", source: "f1-post", target: "f1-email4" },
    {
      id: "e-f1-f3",
      source: "f1-email4",
      sourceHandle: "right",
      target: "f3-trigger",
      label: "produto entregue",
      animated: true,
      style: { stroke: "#16a34a" },
    },

    { id: "e-f2-1", source: "f2-wait1", target: "f2-cond1" },
    { id: "e-f2-2", source: "f2-cond1", target: "f2-email1", label: "Não" },
    { id: "e-f2-3", source: "f2-cond1", sourceHandle: "right", target: "f1-email2", label: "Sim" },
    { id: "e-f2-4", source: "f2-email1", target: "f2-wait2" },
    { id: "e-f2-5", source: "f2-wait2", target: "f2-cond2" },
    { id: "e-f2-6", source: "f2-cond2", target: "f2-email2", label: "Não" },
    { id: "e-f2-7", source: "f2-cond2", sourceHandle: "right", target: "f1-email2", label: "Sim" },
    { id: "e-f2-8", source: "f2-email2", target: "f2-exit" },
    {
      id: "e-f2-9",
      source: "f2-email2",
      sourceHandle: "right",
      target: "f1-email2",
      label: "cliente paga depois",
      style: { strokeDasharray: "4 4" },
    },

    { id: "e-f3-0", source: "f3-trigger", target: "f3-email0" },
    { id: "e-f3-1", source: "f3-email0", target: "f3-wait" },
    { id: "e-f3-2", source: "f3-wait", target: "f3-email1" },
    { id: "e-f3-3", source: "f3-email1", target: "f3-click" },
    { id: "e-f3-4", source: "f3-click", target: "f3-cond" },
    { id: "e-f3-6", source: "f3-cond", target: "f3-list", label: "4 a 10" },
    { id: "e-f3-7", source: "f3-cond", sourceHandle: "right", target: "f3-low", label: "0 a 5" },
    { id: "e-f3-7b", source: "f3-low", target: "f3-nomkt", label: "0 a 3", style: { strokeDasharray: "4 4" } },
    { id: "e-f3-8", source: "f3-list", target: "f3-ref" },
    { id: "e-f3-8b", source: "f3-ref", target: "f3-google" },
    { id: "e-f3-9", source: "f3-google", target: "f3-back" },
    { id: "e-f3-10", source: "f3-low", sourceHandle: "right", target: "f3-back", style: { strokeDasharray: "4 4" } },

    { id: "e-f4-1", source: "f4-trigger", target: "f4-wait" },
    { id: "e-f4-2", source: "f4-wait", target: "f4-pick" },
    { id: "e-f4-3", source: "f4-pick", target: "f4-email" },
    { id: "e-f4-4", source: "f4-email", sourceHandle: "right", target: "f4-wait", label: "repete a cada 20 dias", style: { strokeDasharray: "4 4" } },
    { id: "e-f4-5", source: "f4-email", target: "f4-exit", label: "se clicar", style: { strokeDasharray: "4 4" } },

    { id: "e-f5-1", source: "f5-trigger", target: "f5-cond" },
    { id: "e-f5-2", source: "f5-cond", target: "f5-email", label: "Sim" },
    { id: "e-f5-3", source: "f5-cond", sourceHandle: "right", target: "f5-no", label: "Não" },
    { id: "e-f5-4", source: "f5-reset-trigger", target: "f5-reset-note" },

    { id: "e-f7-1", source: "f7-trigger1", target: "f7-email1" },
    { id: "e-f7-2", source: "f7-trigger2", target: "f7-email2" },
    { id: "e-f8-1", source: "f8-trigger", target: "f8-email" },

    { id: "e-f9-1", source: "f9-trigger", target: "f9-wait1" },
    { id: "e-f9-2", source: "f9-wait1", target: "f9-cond1" },
    { id: "e-f9-3", source: "f9-cond1", target: "f9-email1", label: "Não" },
    { id: "e-f9-4", source: "f9-cond1", sourceHandle: "right", target: "f9-stop", label: "Sim" },
    { id: "e-f9-5", source: "f9-email1", target: "f9-wait2" },
    { id: "e-f9-6", source: "f9-wait2", target: "f9-cond2" },
    { id: "e-f9-7", source: "f9-cond2", target: "f9-email2", label: "Não" },
    { id: "e-f9-8", source: "f9-cond2", sourceHandle: "right", target: "f9-stop", label: "Sim" },
    { id: "e-f9-9", source: "f9-email2", target: "f9-exit" },

    { id: "e-f6-1", source: "f6-trigger", target: "f6-ui" },
    { id: "e-f6-2", source: "f6-ui", target: "f6-cond" },
    { id: "e-f6-3", source: "f6-cond", target: "f6-yes", label: "Sim" },
    { id: "e-f6-4", source: "f6-cond", sourceHandle: "right", target: "f6-no", label: "Não" },
    { id: "e-f6-5", source: "f6-yes", target: "f6-list" },
    { id: "e-f6-6", source: "f6-no", target: "f6-list" },
    {
      id: "e-f6-7",
      source: "f6-list",
      target: "f6-restock-trigger",
      label: "espera até repor",
      style: { strokeDasharray: "4 4" },
    },
    { id: "e-f6-8", source: "f6-restock-trigger", target: "f6-email" },
  ];

  return { nodes, edges };
}

type Coupon = { id: string; code: string; discount_percent: number; active: boolean };
type ProductOption = { id: string; title: string; price_cents: number | null };

function FluxoEmailPage() {
  const [editing, setEditing] = useState<{ templateId: string; label: string } | null>(null);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [couponId, setCouponId] = useState<string>(NO_COUPON_VALUE);
  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  useEffect(() => {
    supabase
      .from("coupons")
      .select("id, code, discount_percent, active")
      .order("code")
      .then(({ data }) => setCoupons(data ?? []));
    supabase
      .from("products")
      .select("id, title, product_variants(price_cents)")
      .eq("status", "published")
      .order("title")
      .then(({ data }) =>
        setProducts(
          (data ?? []).map((p) => ({
            id: p.id,
            title: p.title,
            price_cents: (p.product_variants as { price_cents: number }[] | null)?.[0]?.price_cents ?? null,
          })),
        ),
      );
  }, []);

  async function openTemplate(templateId: string, label: string) {
    setEditing({ templateId, label });
    setLoadingTemplate(true);
    const { data, error } = await supabase
      .from("email_templates")
      .select("subject, html_body, coupon_id, featured_product_ids")
      .eq("id", templateId)
      .maybeSingle();
    setLoadingTemplate(false);
    if (error || !data) {
      toast.error("Não foi possível carregar este e-mail.");
      setEditing(null);
      return;
    }
    setSubject(data.subject);
    setHtmlBody(data.html_body);
    setCouponId(data.coupon_id ?? NO_COUPON_VALUE);
    setFeaturedProductIds(data.featured_product_ids ?? []);
  }

  function insertSnippet(snippet: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setHtmlBody((prev) => prev + snippet);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setHtmlBody((prev) => prev.slice(0, start) + snippet + prev.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
    });
  }

  function toggleProduct(productId: string, checked: boolean) {
    setFeaturedProductIds((prev) =>
      checked ? [...prev, productId] : prev.filter((id) => id !== productId),
    );
  }

  async function handleSaveTemplate() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_templates")
      .update({
        subject,
        html_body: htmlBody,
        coupon_id: couponId === NO_COUPON_VALUE ? null : couponId,
        featured_product_ids: featuredProductIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editing.templateId);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar o e-mail.");
      return;
    }
    toast.success("E-mail atualizado — já vale para o próximo envio.");
    setEditing(null);
  }

  const { nodes, edges } = buildFlowGraph(openTemplate);
  const showProductPicker = editing?.templateId === "weekly_marketing";

  return (
    <AdminShell>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Fluxo de E-mail</h1>
        <p className="text-sm text-muted-foreground">
          Clique em uma caixa verde (📧) para editar o assunto, o conteúdo, o cupom e (no e-mail de
          marketing) os produtos em destaque. As caixas cinza/amarelas mostram a lógica — a
          automação de verdade roda sozinha nos horários configurados.
        </p>
      </div>

      <div style={{ height: 620 }} className="overflow-x-auto rounded-lg border bg-[#fcfbf8]">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }}>
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.label}</DialogTitle>
          </DialogHeader>

          {loadingTemplate ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="template-subject">Assunto</Label>
                  <Input id="template-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label>Cupom (opcional)</Label>
                  <Select value={couponId} onValueChange={setCouponId}>
                    <SelectTrigger>
                      <SelectValue>
                        {couponId === NO_COUPON_VALUE
                          ? "Nenhum"
                          : (() => {
                              const c = coupons.find((c) => c.id === couponId);
                              return c ? `${c.code} (${c.discount_percent}%)` : "Nenhum";
                            })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_COUPON_VALUE}>Nenhum</SelectItem>
                      {coupons.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} ({c.discount_percent}%) {c.active ? "" : "— inativo"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Escolher aqui evita referenciar um código que não existe mais — use{" "}
                    <code>{"{{cupom_codigo}}"}</code> e <code>{"{{cupom_desconto}}"}</code> no texto.
                  </p>
                </div>

                {showProductPicker ? (
                  <div className="space-y-1">
                    <Label>Produtos em destaque</Label>
                    <ScrollArea className="h-40 rounded-md border p-2">
                      <div className="space-y-1.5">
                        {products.map((p) => (
                          <label key={p.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={featuredProductIds.includes(p.id)}
                              onCheckedChange={(checked) => toggleProduct(p.id, !!checked)}
                            />
                            <span className="flex-1">{p.title}</span>
                            {p.price_cents != null ? (
                              <span className="text-xs text-muted-foreground">
                                {formatCentsToBRL(p.price_cents)}
                              </span>
                            ) : null}
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground">
                      Aparecem automaticamente no bloco <code>{"{{produtos_html}}"}</code>.
                    </p>
                  </div>
                ) : null}

                <div className="space-y-1">
                  <Label>Inserir na mensagem</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {INSERT_BLOCKS.map((block) => (
                      <Button
                        key={block.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertSnippet(block.snippet)}
                      >
                        {block.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="template-body">Conteúdo</Label>
                  <Textarea
                    id="template-body"
                    ref={textareaRef}
                    value={htmlBody}
                    onChange={(e) => setHtmlBody(e.target.value)}
                    rows={14}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Pré-visualização (com a moldura da marca)</Label>
                <iframe
                  title="Pré-visualização do e-mail"
                  srcDoc={wrapBrandedPreview(htmlBody)}
                  className="h-[480px] w-full rounded-md border bg-white"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving || loadingTemplate}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
