import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquareText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/marketing/nps/")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: NpsPage,
});

type NpsRow = {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  nps_score: number;
  nps_would_recommend: boolean | null;
  nps_feedback: string | null;
  nps_survey_sent_at: string | null;
};

function scoreBadgeVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 9) return "default";
  if (score >= 7) return "secondary";
  return "destructive";
}

function NpsPage() {
  const [rows, setRows] = useState<NpsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFeedback, setOpenFeedback] = useState<NpsRow | null>(null);

  useEffect(() => {
    supabase
      .from("orders")
      .select("id, user_id, customer_name, customer_email, nps_score, nps_would_recommend, nps_feedback, nps_survey_sent_at")
      .not("nps_score", "is", null)
      .order("nps_survey_sent_at", { ascending: false })
      .then(({ data }) => {
        setRows((data ?? []) as NpsRow[]);
        setLoading(false);
      });
  }, []);

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">NPS</h1>
        <p className="text-sm text-muted-foreground">
          Respostas da pesquisa de satisfação enviada 7 dias após a entrega.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhuma resposta registrada ainda.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID do cliente</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Indicaria?</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {row.user_id ? row.user_id.slice(0, 8) : "—"}
                </TableCell>
                <TableCell>{row.customer_name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {row.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={scoreBadgeVariant(row.nps_score)}>{row.nps_score}</Badge>
                    {row.nps_feedback ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Ver o que o cliente escreveu"
                        onClick={() => setOpenFeedback(row)}
                      >
                        <MessageSquareText className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  {row.nps_would_recommend == null ? "—" : row.nps_would_recommend ? "Sim" : "Não"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!openFeedback} onOpenChange={(open) => !open && setOpenFeedback(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {openFeedback?.customer_name ?? "Cliente"} — nota {openFeedback?.nps_score}
            </DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm">{openFeedback?.nps_feedback}</p>
          {openFeedback?.customer_email ? (
            <p className="text-xs text-muted-foreground">
              {openFeedback.customer_email} · pedido {openFeedback.id.slice(0, 8)}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
