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
    <div style="background:#12294f; padding:20px 24px; text-align:center;">
      <span style="color:#ffffff; font-size:20px; font-weight:800; letter-spacing:0.5px;">ALNA COMMERCE</span>
    </div>
    <div style="padding:28px 24px; color:#12294f; font-size:15px; line-height:1.55;">
      ${innerHtml}
    </div>
    <div style="background:#f9fafb; padding:20px 24px; text-align:center; font-size:12px; color:#6b7280;">
      <p style="margin:0;">Alna Commerce — CNPJ 57.135.009/0001-27</p>
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

    // Fluxo 2 — Recuperação de carrinho. As duas ramificações "Pagou? → Sim" e o pagamento após a
    // "última chance" apontam de volta para f1-email2 em vez de terminar num "Fim" separado.
    plainNode("f2-wait1", 480, 120, "Espera 10 minutos", "wait"),
    plainNode("f2-cond1", 480, 240, "Pagou?", "condition"),
    emailNode("f2-email1", 480, 350, "Carrinho esperando", "cart_reminder_10min"),
    plainNode("f2-wait2", 480, 460, "Espera 24 horas", "wait"),
    plainNode("f2-cond2", 480, 570, "Pagou?", "condition"),
    emailNode("f2-email2", 480, 680, "Última chance + cupom", "cart_reminder_24h"),
    plainNode("f2-exit", 480, 790, "Sair da lista", "exit"),

    // Fluxo 3 — Pós-compra / NPS / indicação — encadeado direto do Fluxo 1.
    plainNode("f3-trigger", 840, 240, "Entrega confirmada (rastreio)", "trigger"),
    emailNode("f3-email0", 840, 350, "Pedido chegou!", "delivery_confirmed"),
    plainNode("f3-wait", 840, 460, "Espera 7 dias", "wait"),
    emailNode("f3-email1", 840, 570, "Participe e ganhe 5% na próxima compra", "post_purchase_nps"),
    plainNode("f3-click", 840, 680, "Cliente responde na landing page (nota + indicaria)", "wait"),
    emailNode("f3-email2", 840, 790, "Obrigado + indique e ganhe 5%", "nps_thank_you"),
    plainNode("f3-cond", 840, 900, "Nota ≥ 5?", "condition"),
    plainNode("f3-list", 840, 1010, "Entra na lista de marketing", "trigger"),
    plainNode("f3-end", 1120, 900, "Fim (sem marketing)", "exit"),

    // Fluxo 4 — Marketing por assinante: 15 dias → 1º e-mail, 20 dias → 2º, 15 em 15 dias depois.
    plainNode("f4-trigger", 1260, 0, "Cliente na lista de marketing", "trigger"),
    plainNode("f4-wait1", 1260, 110, "Espera 15 dias", "wait"),
    emailNode("f4-email1", 1260, 220, "E-mail #1", "weekly_marketing"),
    plainNode("f4-wait2", 1260, 330, "Espera 20 dias", "wait"),
    emailNode("f4-email2", 1260, 440, "E-mail #2", "weekly_marketing"),
    plainNode("f4-wait3", 1260, 550, "Espera 15 dias (e assim por diante)", "wait"),
    emailNode("f4-email3", 1260, 660, "E-mail #3+", "weekly_marketing"),
    plainNode("f4-exit", 1260, 770, "Sair da lista", "exit"),
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
    {
      id: "e-f1-f3",
      source: "f1-email2",
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
    { id: "e-f3-4", source: "f3-click", target: "f3-email2" },
    { id: "e-f3-5", source: "f3-email2", target: "f3-cond" },
    { id: "e-f3-6", source: "f3-cond", target: "f3-list", label: "Sim" },
    { id: "e-f3-7", source: "f3-cond", sourceHandle: "right", target: "f3-end", label: "Não" },

    { id: "e-f4-1", source: "f4-trigger", target: "f4-wait1" },
    { id: "e-f4-2", source: "f4-wait1", target: "f4-email1" },
    { id: "e-f4-3", source: "f4-email1", target: "f4-wait2" },
    { id: "e-f4-4", source: "f4-wait2", target: "f4-email2" },
    { id: "e-f4-5", source: "f4-email2", target: "f4-wait3" },
    { id: "e-f4-6", source: "f4-wait3", target: "f4-email3" },
    { id: "e-f4-7", source: "f4-email3", target: "f4-exit" },
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
