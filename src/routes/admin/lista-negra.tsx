import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/lista-negra")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: ListaNegraPage,
});

type Bloqueado = { email: string; motivo: string | null; criado_em: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Lista negra: e-mails que não podem salvar carrinho nem seguir para o checkout (bots, testes ou fraudes).
// Só o dono decide quem entra. O bloqueio vale para o e-mail exato.
function ListaNegraPage() {
  const [itens, setItens] = useState<Bloqueado[] | null>(null);
  const [email, setEmail] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const { data, error } = await supabase
      .from("blocked_emails")
      .select("email, motivo, criado_em")
      .order("criado_em", { ascending: false });
    if (error) {
      toast.error("Não foi possível carregar a lista negra.");
      setItens([]);
      return;
    }
    setItens((data ?? []) as Bloqueado[]);
  }

  useEffect(() => {
    void carregar();
  }, []);

  async function bloquear(e: React.FormEvent) {
    e.preventDefault();
    const alvo = email.trim().toLowerCase();
    if (!EMAIL_RE.test(alvo)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase
      .from("blocked_emails")
      .insert({ email: alvo, motivo: motivo.trim() || null });
    setSalvando(false);
    if (error) {
      toast.error(error.code === "23505" ? "Esse e-mail já está na lista." : "Não foi possível bloquear.");
      return;
    }
    toast.success("E-mail incluído na lista negra.");
    setEmail("");
    setMotivo("");
    void carregar();
  }

  async function desbloquear(alvo: string) {
    if (!window.confirm(`Remover ${alvo} da lista negra? Ele volta a poder salvar carrinho.`)) return;
    const { error } = await supabase.from("blocked_emails").delete().eq("email", alvo);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    toast.success("E-mail removido da lista negra.");
    void carregar();
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Lista negra</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            E-mails bloqueados não salvam carrinho e não entram nos relatórios de contato. Inclua só
            depois de confirmar que são bots, testes ou fraudes.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={bloquear} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-1">
                <label htmlFor="lista-negra-email" className="text-xs font-medium">
                  E-mail
                </label>
                <Input
                  id="lista-negra-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@exemplo.com"
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="lista-negra-motivo" className="text-xs font-medium">
                  Motivo (opcional)
                </label>
                <Input
                  id="lista-negra-motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="ex.: bot de teste, e-mail falso"
                />
              </div>
              <Button type="submit" disabled={salvando}>
                Bloquear
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {itens === null ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : itens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum e-mail bloqueado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Bloqueado em</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.email}>
                      <TableCell className="font-medium">{item.email}</TableCell>
                      <TableCell>{item.motivo ?? "—"}</TableCell>
                      <TableCell>{new Date(item.criado_em).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => desbloquear(item.email)}>
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
