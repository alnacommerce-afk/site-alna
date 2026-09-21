import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/emails")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: EmailsPage,
});

const PAGE_SIZE = 25;

type EmailRow = {
  id: string;
  created_at: string;
  from_email: string;
  to_email: string;
  subject: string;
  template: string | null;
  status: string;
  provider_id: string | null;
  error: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  sent: "Enviado",
  failed: "Falhou",
  skipped: "Não enviado",
};

const TEMPLATE_LABEL: Record<string, string> = {
  order_received: "Pedido recebido",
  payment_confirmed: "Pagamento confirmado",
  admin_new_sale: "Aviso de venda (admin)",
  cart_reminder_10min: "Carrinho (10 min)",
  cart_reminder_24h: "Carrinho (24 h)",
  delivery_confirmed: "Pedido entregue",
  nps_thank_you: "NPS — agradecimento",
  post_purchase_nps: "NPS — pesquisa",
  referral_reward: "Indicação",
  weekly_marketing: "Novidades da semana",
  password_reset: "Nova senha (esqueci minha senha)",
  teste: "Teste de envio",
};

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "sent") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function EmailsPage() {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EmailRow | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      let query = supabase
        .from("email_send_log")
        .select(
          "id, created_at, from_email, to_email, subject, template, status, provider_id, error",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (status !== "all") query = query.eq("status", status);
      if (search) {
        // Commas and parentheses would break the PostgREST `or` filter syntax.
        const safe = search.replace(/[,()%*]/g, " ").trim();
        if (safe) query = query.or(`to_email.ilike.%${safe}%,subject.ilike.%${safe}%`);
      }
      const { data, count, error } = await query;
      if (cancelled) return;
      if (error) {
        toast.error("Não foi possível carregar os e-mails.");
        setLoading(false);
        return;
      }
      setRows((data ?? []) as EmailRow[]);
      setTotal(count ?? 0);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, status, search, reloadKey]);

  // The HTML body is only fetched when a row is opened, so the list stays light.
  async function openEmail(row: EmailRow) {
    setSelected(row);
    setPreview(null);
    setLoadingPreview(true);
    const { data, error } = await supabase
      .from("email_send_log")
      .select("html")
      .eq("id", row.id)
      .maybeSingle();
    setLoadingPreview(false);
    if (error) {
      toast.error("Não foi possível carregar o conteúdo do e-mail.");
      return;
    }
    setPreview(data?.html ?? null);
  }

  async function sendTestEmail() {
    setSendingTest(true);
    const { data, error } = await supabase.functions.invoke("send-test-email");
    // A non-2xx answer (e.g. Resend refused the send) arrives as `error`; its body has the reason.
    let result: { status?: string; to?: string; error?: string } | null = data;
    if (error && !result) {
      try {
        result = await (error as { context?: Response }).context?.json();
      } catch {
        result = null;
      }
    }
    setSendingTest(false);
    if (result?.status === "sent") {
      toast.success(`E-mail de teste enviado para ${result.to}.`);
    } else {
      toast.error(result?.error ?? "Não foi possível enviar o e-mail de teste.");
    }
    setPage(0);
    setReloadKey((k) => k + 1);
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">E-mails enviados</h1>
          <p className="text-sm text-muted-foreground">
            Todo e-mail que a loja tenta enviar fica registrado aqui — enviado, com falha ou não
            enviado — com o conteúdo exatamente como o cliente recebeu.
          </p>
        </div>
        <Button variant="outline" onClick={sendTestEmail} disabled={sendingTest}>
          {sendingTest ? "Enviando..." : "Enviar e-mail de teste"}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setSearch(searchDraft.trim());
          }}
        >
          <Input
            className="w-72"
            placeholder="Buscar por e-mail ou assunto"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
        <Select
          value={status}
          onValueChange={(value) => {
            setPage(0);
            setStatus(value);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="sent">Enviados</SelectItem>
            <SelectItem value="failed">Com falha</SelectItem>
            <SelectItem value="skipped">Não enviados</SelectItem>
          </SelectContent>
        </Select>
        <p className="ml-auto text-sm text-muted-foreground">{total} registro(s)</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Para</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum e-mail registrado.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => openEmail(row)}
                  >
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(row.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">{row.to_email}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{row.subject}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.template ? (TEMPLATE_LABEL[row.template] ?? row.template) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>
                        {STATUS_LABEL[row.status] ?? row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-end gap-3">
        <span className="text-sm text-muted-foreground">
          Página {page + 1} de {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0 || loading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= pageCount || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </Button>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="pr-6 text-base">{selected?.subject}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">Data</dt>
                <dd>{formatDateTime(selected.created_at)}</dd>
                <dt className="text-muted-foreground">De</dt>
                <dd>{selected.from_email}</dd>
                <dt className="text-muted-foreground">Para</dt>
                <dd>{selected.to_email}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{STATUS_LABEL[selected.status] ?? selected.status}</dd>
                {selected.provider_id ? (
                  <>
                    <dt className="text-muted-foreground">ID Resend</dt>
                    <dd className="break-all font-mono text-xs">{selected.provider_id}</dd>
                  </>
                ) : null}
                {selected.error ? (
                  <>
                    <dt className="text-muted-foreground">Erro</dt>
                    <dd className="break-words text-destructive">{selected.error}</dd>
                  </>
                ) : null}
              </dl>

              <div className="overflow-hidden rounded-md border bg-muted/30">
                {loadingPreview ? (
                  <p className="p-4 text-muted-foreground">Carregando conteúdo...</p>
                ) : preview ? (
                  // sandbox="" blocks scripts, forms and navigation: the stored HTML is only shown.
                  <iframe
                    title="Conteúdo do e-mail"
                    sandbox=""
                    srcDoc={preview}
                    className="h-[420px] w-full bg-white"
                  />
                ) : (
                  <p className="p-4 text-muted-foreground">Conteúdo não disponível.</p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
