import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatCentsToBRL } from "@/lib/money";
import { AdminShell } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/marketing/ideias-post/")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: IdeiasPostPage,
});

type ProductOption = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  minPriceCents: number | null;
};

type Concept = "produto" | "lifestyle" | "beneficio";

const CONCEPT_LABEL: Record<Concept, string> = {
  produto: "Produto em destaque",
  lifestyle: "Lifestyle",
  beneficio: "Benefício",
};
const ALL_CONCEPTS: Concept[] = ["produto", "lifestyle", "beneficio"];

type Idea =
  | { ok: true; concept: Concept; imageUrl: string; title: string; caption: string; cta: string; hashtags: string[] }
  | { ok: false; concept: Concept; code: string; error: string };

const PROGRESS_STEPS = [
  "Analisando produto",
  "Criando conceitos",
  "Gerando imagens",
  "Preparando textos",
  "Finalizando",
];

const FUNCTIONS_URL = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1`;

function downloadFileName(productSlugish: string, concept: Concept, index: number, mimeType: string) {
  const ext = mimeType.includes("png") ? "png" : "jpg";
  return `ideia-post-${productSlugish}-${index + 1}-${concept}.${ext}`;
}

function IdeiasPostPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [retryingConcept, setRetryingConcept] = useState<Concept | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [ideas, setIdeas] = useState<Idea[] | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, product_images(storage_path, position), product_variants(price_cents)")
        .eq("status", "published")
        .order("title");
      if (error) {
        toast.error("Não foi possível carregar os produtos.");
        setLoadingProducts(false);
        return;
      }
      setProducts(
        (data ?? []).map((p) => {
          const images = [...((p.product_images as { storage_path: string; position: number }[] | null) ?? [])].sort(
            (a, b) => a.position - b.position,
          );
          const prices = (p.product_variants as { price_cents: number }[] | null)?.map((v) => v.price_cents) ?? [];
          return {
            id: p.id,
            title: p.title,
            thumbnailUrl: images[0]
              ? supabase.storage.from("product-media").getPublicUrl(images[0].storage_path).data.publicUrl
              : null,
            minPriceCents: prices.length ? Math.min(...prices) : null,
          };
        }),
      );
      setLoadingProducts(false);
    }
    load();
  }, []);

  const filtered = useMemo(
    () => products.filter((p) => p.title.toLowerCase().includes(search.trim().toLowerCase())),
    [products, search],
  );
  const selectedProducts = products.filter((p) => selectedIds.includes(p.id));

  function toggleProduct(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));
  }

  // A slug-ish tag for the downloaded filename — doesn't need to be the real product slug.
  const fileTag = selectedProducts.map((p) => p.title).join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "produto";

  async function callGenerate(concepts: Concept[]): Promise<Idea[]> {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error("Sessão expirada. Faça login novamente.");

    const resp = await fetch(`${FUNCTIONS_URL}/generate-post-ideas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ productIds: selectedIds, concepts }),
    });
    const json = await resp.json();
    if (!resp.ok || json.error) throw new Error(json.error ?? "Erro ao consultar a IA.");
    return json.ideas as Idea[];
  }

  async function handleGenerate() {
    if (generating) return; // proteção contra clique duplo
    if (selectedIds.length === 0) {
      toast.error("Selecione pelo menos um produto para criar as ideias.");
      return;
    }

    setGenerating(true);
    setIdeas(null);
    setProgressStep(0);
    const progressTimer = window.setInterval(() => {
      setProgressStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1));
    }, 3000);

    try {
      const result = await callGenerate(ALL_CONCEPTS);
      setIdeas(result);
      const failed = result.filter((i) => !i.ok).length;
      if (failed === 0) toast.success("3 ideias criadas!");
      else if (failed < result.length) toast.error(`${failed} de ${result.length} ideias falharam — veja os cards.`);
      else toast.error("Não foi possível gerar as ideias. Veja o motivo em cada card.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar as ideias.");
    } finally {
      window.clearInterval(progressTimer);
      setGenerating(false);
    }
  }

  async function handleRetry(concept: Concept) {
    if (retryingConcept) return;
    setRetryingConcept(concept);
    try {
      const [result] = await callGenerate([concept]);
      setIdeas((prev) => (prev ? prev.map((i) => (i.concept === concept ? result! : i)) : [result!]));
      if (result?.ok) toast.success("Ideia gerada novamente.");
      else toast.error(result?.error ?? "Ainda não foi possível gerar esta ideia.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao tentar novamente.");
    } finally {
      setRetryingConcept(null);
    }
  }

  async function handleCopyText(idea: Extract<Idea, { ok: true }>) {
    const text = `${idea.title}\n\n${idea.caption}\n\n${idea.cta}\n\n${idea.hashtags.join(" ")}`;
    await navigator.clipboard.writeText(text);
    toast.success("Texto copiado!");
  }

  async function handleDownload(idea: Extract<Idea, { ok: true }>, index: number) {
    try {
      const resp = await fetch(idea.imageUrl);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFileName(fileTag, idea.concept, index, blob.type || "image/png");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível baixar a imagem. Tente clicar com o botão direito e salvar.");
    }
  }

  return (
    <AdminShell>
      <div className="mb-6 max-w-2xl">
        <h1 className="text-xl font-semibold">Ideias de Post</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um ou mais produtos e gere 3 ideias completas de post para Instagram — imagem,
          legenda, CTA e hashtags — prontas para baixar e publicar.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <Label htmlFor="busca-produto">Buscar produto</Label>
          <Input
            id="busca-produto"
            placeholder="Digite o nome do produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loadingProducts ? (
            <p className="text-sm text-muted-foreground">Carregando produtos...</p>
          ) : (
            <div className="max-h-[420px] space-y-1.5 overflow-y-auto rounded-lg border p-2">
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>
              ) : (
                filtered.map((p) => {
                  const checked = selectedIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-md p-2 text-sm hover:bg-accent ${
                        checked ? "bg-accent" : ""
                      }`}
                    >
                      <Checkbox checked={checked} onCheckedChange={(v) => toggleProduct(p.id, v === true)} />
                      {p.thumbnailUrl ? (
                        <img src={p.thumbnailUrl} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-[#12294f]">{p.title}</p>
                        {p.minPriceCents != null ? (
                          <p className="text-xs text-muted-foreground">{formatCentsToBRL(p.minPriceCents)}</p>
                        ) : null}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-[#12294f]">
            Selecionados ({selectedProducts.length})
          </p>
          {selectedProducts.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              Nenhum produto selecionado ainda.
            </p>
          ) : (
            <div className="space-y-1.5">
              {selectedProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  {p.thumbnailUrl ? (
                    <img src={p.thumbnailUrl} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : null}
                  <span className="flex-1 truncate">{p.title}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => toggleProduct(p.id, false)}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            size="lg"
            className="w-full bg-[#16a34a] font-bold hover:bg-[#16a34a]/90"
            disabled={generating || selectedIds.length === 0}
            onClick={handleGenerate}
          >
            {generating ? "Criando..." : "Criar 3 Ideias"}
          </Button>
          {ideas ? (
            <Button type="button" variant="outline" className="w-full" disabled={generating} onClick={handleGenerate}>
              Gerar novas ideias
            </Button>
          ) : null}
        </div>
      </div>

      {generating ? (
        <div className="mt-8 rounded-lg border bg-muted/30 p-6">
          <p className="mb-3 text-sm font-medium text-[#12294f]">Criando suas ideias de conteúdo...</p>
          <ol className="space-y-1.5 text-sm">
            {PROGRESS_STEPS.map((step, i) => (
              <li key={step} className={i <= progressStep ? "font-medium text-[#16a34a]" : "text-muted-foreground"}>
                {i < progressStep ? "✓ " : i === progressStep ? "… " : "  "}
                {step}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {ideas && !generating ? (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {ideas.map((idea, index) => (
            <div key={idea.concept} className="overflow-hidden rounded-lg border bg-white">
              <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#12294f]">
                  Ideia {index + 1} — {CONCEPT_LABEL[idea.concept]}
                </span>
              </div>

              {idea.ok ? (
                <>
                  <img src={idea.imageUrl} alt={idea.title} className="aspect-square w-full object-cover" />
                  <div className="space-y-2 p-3">
                    <p className="text-sm font-semibold text-[#12294f]">{idea.title}</p>
                    <p className="whitespace-pre-line text-xs text-muted-foreground">{idea.caption}</p>
                    <p className="text-xs font-medium text-[#16a34a]">{idea.cta}</p>
                    <div className="flex flex-wrap gap-1">
                      {idea.hashtags.map((h) => (
                        <Badge key={h} variant="secondary" className="text-[10px]">
                          {h}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDownload(idea, index)}
                      >
                        Baixar imagem
                      </Button>
                      <Button type="button" size="sm" className="flex-1" onClick={() => handleCopyText(idea)}>
                        Copiar texto
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3 p-4">
                  <div className="flex aspect-square w-full items-center justify-center rounded-md bg-destructive/5 text-center text-xs text-destructive">
                    {idea.error}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={retryingConcept === idea.concept}
                    onClick={() => handleRetry(idea.concept)}
                  >
                    {retryingConcept === idea.concept ? "Tentando..." : "Tentar novamente esta ideia"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </AdminShell>
  );
}
