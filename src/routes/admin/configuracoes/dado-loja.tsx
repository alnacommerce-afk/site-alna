import { createFileRoute } from "@tanstack/react-router";

import { ConfiguracoesForm } from "@/components/admin/configuracoes-form";

export const Route = createFileRoute("/admin/configuracoes/dado-loja")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => <ConfiguracoesForm section="dado-loja" />,
});
