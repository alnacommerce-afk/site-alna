import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
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

  useEffect(() => {
    supabase
      .from("orders")
      .select("id, user_id, customer_name, customer_email, nps_score, nps_would_recommend, nps_survey_sent_at")
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
                  <Badge variant={scoreBadgeVariant(row.nps_score)}>{row.nps_score}</Badge>
                </TableCell>
                <TableCell>
                  {row.nps_would_recommend == null ? "—" : row.nps_would_recommend ? "Sim" : "Não"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AdminShell>
  );
}
