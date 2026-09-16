import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/conexoes")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: ConexoesPage,
});

type Connection = {
  id: string;
  label: string;
  status: "pending" | "connected";
  notes: string | null;
  secret_id: string | null;
};

const SECRET_INTEGRATIONS = new Set(["melhor_envio", "payment_gateway", "resend", "ai_seo", "google_analytics"]);

const CONNECTION_HELP: Record<string, string> = {
  ai_seo:
    "Usada pelo botão \"IA complementa\" no cadastro de produtos, para sugerir título, meta descrição, palavra-chave de foco, termos de busca alternativos e o texto alternativo das fotos. Cole abaixo uma chave gratuita do Google AI Studio (aistudio.google.com/apikey).",
  melhor_envio:
    "Calcula o frete automaticamente e permite gerar etiquetas de envio. Cole abaixo o token de API (Painel Melhor Envio → Gerenciar → Tokens).",
  payment_gateway:
    "Processa Pix e cartão de crédito (até 12x) no checkout. Gere a chave em Asaas → Configurações → Integração → Chave de API. Use a chave de PRODUÇÃO (começa com \"$aact_prod_\") — não a de sandbox — pois o checkout já está configurado para cobrar de verdade.",
  meta_instagram:
    "Exige um catálogo de produtos publicado, domínio verificado no Meta Business Manager e as páginas de política já publicadas no site (Privacidade, Termos, Trocas e Devoluções). Não usa uma chave simples — a conexão é feita por OAuth no painel do Meta.",
  resend:
    "Envia e-mails transacionais (confirmação de pedido, contato). Cole abaixo a API key gerada em resend.com/api-keys.",
  google_search_console:
    "A verificação por meta tag já está publicada no site. Basta adicionar a propriedade em search.google.com/search-console usando o domínio.",
  google_analytics:
    "Mostra o número de visitantes em tempo real na Visão Geral. Cole abaixo o conteúdo INTEIRO do arquivo JSON da conta de serviço do Google Cloud (com acesso de leitor na propriedade GA4). Também é preciso preencher o Measurement ID e o Property ID em Admin > Configurações.",
};

function ConexoesPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [secretDraft, setSecretDraft] = useState<Record<string, string>>({});
  const [savingSecretFor, setSavingSecretFor] = useState<string | null>(null);
  const [connectionToClear, setConnectionToClear] = useState<Connection | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("integration_connections")
      .select("id, label, status, notes, secret_id")
      .order("label");

    if (error) {
      toast.error("Não foi possível carregar as conexões.");
      setLoading(false);
      return;
    }
    setConnections((data ?? []) as Connection[]);
    setNotesDraft(Object.fromEntries((data ?? []).map((c) => [c.id, c.notes ?? ""])));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleStatus(connection: Connection) {
    const nextStatus = connection.status === "connected" ? "pending" : "connected";
    const { error } = await supabase
      .from("integration_connections")
      .update({ status: nextStatus })
      .eq("id", connection.id);

    if (error) {
      toast.error("Não foi possível atualizar o status.");
      return;
    }
    toast.success(nextStatus === "connected" ? "Marcado como conectado." : "Marcado como pendente.");
    load();
  }

  async function saveNotes(id: string) {
    const { error } = await supabase
      .from("integration_connections")
      .update({ notes: notesDraft[id] || null })
      .eq("id", id);

    if (error) {
      toast.error("Não foi possível salvar a anotação.");
      return;
    }
    toast.success("Anotação salva.");
  }

  async function saveSecret(id: string) {
    const value = (secretDraft[id] ?? "").trim();
    if (!value) {
      toast.error("Cole a chave antes de salvar.");
      return;
    }

    setSavingSecretFor(id);
    const { error } = await supabase.rpc("set_integration_secret", {
      p_integration_id: id,
      p_secret_value: value,
    });
    setSavingSecretFor(null);

    if (error) {
      toast.error("Não foi possível salvar a chave.");
      return;
    }
    setSecretDraft((prev) => ({ ...prev, [id]: "" }));
    toast.success("Chave salva com segurança. Marcado como conectado.");
    load();
  }

  async function confirmClearSecret() {
    if (!connectionToClear) return;
    const id = connectionToClear.id;
    setConnectionToClear(null);

    const { error } = await supabase.rpc("clear_integration_secret", {
      p_integration_id: id,
    });

    if (error) {
      toast.error("Não foi possível remover a chave.");
      return;
    }
    toast.success("Chave removida.");
    load();
  }

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Conexões de API</h1>
        <p className="text-sm text-muted-foreground">
          Cole aqui as chaves de cada integração. Elas são guardadas criptografadas no Supabase
          Vault — depois de salvas, nem esta tela nem o banco de dados mostram o valor de volta;
          só o servidor consegue usá-las para chamar as APIs externas.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid max-w-3xl gap-4">
          {connections.map((connection) => {
            const needsSecret = SECRET_INTEGRATIONS.has(connection.id);
            const hasSecret = !!connection.secret_id;

            return (
              <Card key={connection.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-[#12294f]">{connection.label}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant={connection.status === "connected" ? "default" : "secondary"}
                        >
                          {connection.status === "connected" ? "Conectado" : "Pendente"}
                        </Badge>
                        {hasSecret ? (
                          <span className="text-xs text-muted-foreground">
                            Chave configurada ✓
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {!needsSecret ? (
                      <Button variant="outline" size="sm" onClick={() => toggleStatus(connection)}>
                        {connection.status === "connected"
                          ? "Marcar como pendente"
                          : "Marcar como conectado"}
                      </Button>
                    ) : null}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {CONNECTION_HELP[connection.id]}
                  </p>

                  {needsSecret ? (
                    <div className="space-y-2 rounded-md border border-dashed p-3">
                      <Label htmlFor={`secret-${connection.id}`} className="text-xs">
                        {hasSecret ? "Substituir chave" : "Chave / Token de API"}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={`secret-${connection.id}`}
                          type="password"
                          autoComplete="off"
                          placeholder={hasSecret ? "•••••••••••••••• (salva)" : "Cole a chave aqui"}
                          value={secretDraft[connection.id] ?? ""}
                          onChange={(e) =>
                            setSecretDraft((prev) => ({ ...prev, [connection.id]: e.target.value }))
                          }
                        />
                        <Button
                          size="sm"
                          onClick={() => saveSecret(connection.id)}
                          disabled={savingSecretFor === connection.id}
                        >
                          {savingSecretFor === connection.id ? "Salvando..." : "Salvar"}
                        </Button>
                      </div>
                      {hasSecret ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setConnectionToClear(connection)}
                        >
                          Remover chave
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-1">
                    <Textarea
                      rows={2}
                      placeholder="Anotações (ex: conta usada, data de ativação)"
                      value={notesDraft[connection.id] ?? ""}
                      onChange={(e) =>
                        setNotesDraft((prev) => ({ ...prev, [connection.id]: e.target.value }))
                      }
                      className="text-sm"
                    />
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => saveNotes(connection.id)}>
                        Salvar anotação
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={!!connectionToClear}
        onOpenChange={(open) => !open && setConnectionToClear(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover chave</AlertDialogTitle>
            <AlertDialogDescription>
              Remover a chave salva de "{connectionToClear?.label}"? A integração voltará a
              ficar pendente até uma nova chave ser salva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearSecret}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
