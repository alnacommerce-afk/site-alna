import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

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
};

const CONNECTION_HELP: Record<string, string> = {
  melhor_envio:
    "Calcula o frete automaticamente no carrinho. Peça o token de API na sua conta Melhor Envio e me envie para eu configurar como credencial segura no servidor — a chave nunca fica salva nesta tela.",
  payment_gateway:
    "Ainda não escolhemos o gateway (Mercado Pago, Stripe, etc.). Quando decidirmos, a chave secreta também é configurada como credencial segura no servidor, nunca aqui.",
  meta_instagram:
    "Exige um catálogo de produtos publicado, domínio verificado no Meta Business Manager e as páginas de política já publicadas no site (Privacidade, Termos, Trocas e Devoluções).",
  resend: "Envia e-mails transacionais (confirmação de pedido, contato). A chave de API é configurada como credencial segura no servidor.",
  google_search_console:
    "A verificação por meta tag já está publicada no site. Basta adicionar a propriedade em search.google.com/search-console usando o domínio.",
};

function ConexoesPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("integration_connections")
      .select("id, label, status, notes")
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

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Conexões de API</h1>
        <p className="text-sm text-muted-foreground">
          Status das integrações externas da loja. Chaves e tokens de API nunca são digitados ou
          salvos nesta tela — eles são configurados como credenciais seguras direto no servidor,
          para evitar exposição acidental.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid max-w-3xl gap-4">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-[#12294f]">{connection.label}</p>
                    <Badge
                      variant={connection.status === "connected" ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {connection.status === "connected" ? "Conectado" : "Pendente"}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toggleStatus(connection)}>
                    {connection.status === "connected"
                      ? "Marcar como pendente"
                      : "Marcar como conectado"}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {CONNECTION_HELP[connection.id]}
                </p>

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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => saveNotes(connection.id)}
                    >
                      Salvar anotação
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
