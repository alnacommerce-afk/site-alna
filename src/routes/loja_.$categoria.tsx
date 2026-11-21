import { createFileRoute, redirect } from "@tanstack/react-router";

import { fetchCatalog, LojaPage, nomeDaCategoriaLoja } from "@/routes/loja";

// Endereço próprio de cada categoria da loja: /loja/cozinha, /loja/toalhas, /loja/roupas, /loja/ferramentas.
// Mesma página da /loja, filtrada; o catálogo continua chegando em streaming (sem bloquear a primeira tela).
export const Route = createFileRoute("/loja_/$categoria")({
  beforeLoad: ({ params }) => {
    if (!nomeDaCategoriaLoja(params.categoria)) {
      throw redirect({ to: "/loja", search: { categoria: undefined } });
    }
  },
  loader: () => ({ catalog: fetchCatalog() }),
  head: ({ params }) => {
    const nome = nomeDaCategoriaLoja(params.categoria) ?? "Loja";
    const url = `https://store.alna.sale/loja/${params.categoria}`;
    return {
      meta: [
        { title: `${nome} - Loja ALNA` },
        {
          name: "description",
          content: `Produtos de ${nome.toLowerCase()} da ALNA: utensílios e itens selecionados com qualidade para o seu dia a dia.`,
        },
        { property: "og:title", content: `${nome} - ALNA` },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: LojaCategoriaRoute,
});

function LojaCategoriaRoute() {
  const { catalog } = Route.useLoaderData();
  const { categoria } = Route.useParams();
  return <LojaPage catalog={catalog} categoria={categoria} />;
}
