import { useRef, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ReactFlow, Background, Controls, Handle, Position, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  { label: "Imagem", snippet: '<img src="https://alnacommerce.com/caminho-da-imagem.jpg" alt="" style="max-width:100%;border-radius:8px;margin:16px 0;" />' },
];

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
    // Fluxo 1 — Pedido / Pagamento
    plainNode("f1-trigger", 0, 0, "Pedido criado", "trigger"),
    emailNode("f1-email1", 0, 110, "Pedido recebido", "order_received"),
    plainNode("f1-event", 0, 220, "Evento: pagamento confirmado (webhook Asaas)", "wait"),
    emailNode("f1-email2", 0, 330, "Pagamento confirmado + acesso à conta", "payment_confirmed"),

    // Fluxo 2 — Recuperação de carrinho
    plainNode("f2-trigger", 420, 0, "Pedido pendente criado", "trigger"),
    plainNode("f2-wait1", 420, 110, "Espera 10 minutos", "wait"),
    plainNode("f2-cond1", 420, 220, "Pagou?", "condition"),
    plainNode("f2-ok1", 700, 220, "Fim (já pagou)", "exit"),
    emailNode("f2-email1", 420, 330, "Carrinho esperando", "cart_reminder_10min"),
    plainNode("f2-wait2", 420, 440, "Espera 24 horas", "wait"),
    plainNode("f2-cond2", 420, 550, "Pagou?", "condition"),
    plainNode("f2-ok2", 700, 550, "Fim (já pagou)", "exit"),
    emailNode("f2-email2", 420, 660, "Última chance + cupom ALNA10OFF", "cart_reminder_24h"),
    plainNode("f2-exit", 420, 770, "Sair da lista", "exit"),
  ];

  const edges: Edge[] = [
    { id: "e-f1-1", source: "f1-trigger", target: "f1-email1" },
    { id: "e-f1-2", source: "f1-email1", target: "f1-event" },
    { id: "e-f1-3", source: "f1-event", target: "f1-email2" },

    { id: "e-f2-1", source: "f2-trigger", target: "f2-wait1" },
    { id: "e-f2-2", source: "f2-wait1", target: "f2-cond1" },
    { id: "e-f2-3", source: "f2-cond1", target: "f2-email1", label: "Não" },
    { id: "e-f2-4", source: "f2-cond1", sourceHandle: "right", target: "f2-ok1", label: "Sim" },
    { id: "e-f2-5", source: "f2-email1", target: "f2-wait2" },
    { id: "e-f2-6", source: "f2-wait2", target: "f2-cond2" },
    { id: "e-f2-7", source: "f2-cond2", target: "f2-email2", label: "Não" },
    { id: "e-f2-8", source: "f2-cond2", sourceHandle: "right", target: "f2-ok2", label: "Sim" },
    { id: "e-f2-9", source: "f2-email2", target: "f2-exit" },
  ];

  return { nodes, edges };
}

function FluxoEmailPage() {
  const [editing, setEditing] = useState<{ templateId: string; label: string } | null>(null);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function openTemplate(templateId: string, label: string) {
    setEditing({ templateId, label });
    setLoadingTemplate(true);
    const { data, error } = await supabase
      .from("email_templates")
      .select("subject, html_body")
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

  async function handleSaveTemplate() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_templates")
      .update({ subject, html_body: htmlBody, updated_at: new Date().toISOString() })
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

  return (
    <AdminShell>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Fluxo de E-mail</h1>
        <p className="text-sm text-muted-foreground">
          Clique em uma caixa verde (📧) para editar o assunto e o conteúdo desse e-mail. As caixas
          cinza/amarelas mostram a lógica de espera e condição — a automação de verdade roda
          sozinha a cada 5 minutos.
        </p>
      </div>

      <div style={{ height: 620 }} className="rounded-lg border bg-[#fcfbf8]">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }}>
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
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
                  <Label htmlFor="template-body">Conteúdo (HTML)</Label>
                  <Textarea
                    id="template-body"
                    ref={textareaRef}
                    value={htmlBody}
                    onChange={(e) => setHtmlBody(e.target.value)}
                    rows={16}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Pré-visualização</Label>
                <iframe
                  title="Pré-visualização do e-mail"
                  srcDoc={htmlBody}
                  className="h-[420px] w-full rounded-md border bg-white"
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
