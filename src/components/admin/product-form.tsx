import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { prepareProductImage } from "@/lib/admin/optimize-image";
import { formatDecimalToInput, parseDecimalInput, slugify } from "@/lib/money";
import {
  defaultProductFormValues,
  emptyVariant,
  productFormSchema,
  type ProductFormValues,
} from "@/lib/admin/product-schema";
import {
  clearNewProductDraft,
  getNewProductDraft,
  setNewProductDraft,
  type ProductDraftImage,
} from "@/lib/admin/product-draft-store";
import { CategorySelect } from "@/components/admin/category-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type AiSuggestion = {
  titleSuggestion: string;
  focusKeyword: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  imageAltTexts: string[];
};

type ImageItem = ProductDraftImage;

type ExistingImage = { id: string; storage_path: string; alt_text: string; position: number };

function newKey() {
  return crypto.randomUUID();
}

async function generateUniqueSlug(title: string) {
  const base = slugify(title) || "produto";
  let slug = base;
  for (let attempt = 1; attempt <= 20; attempt++) {
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return slug;
    slug = `${base}-${attempt + 1}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const mode = productId ? "edit" : "create";
  // Reused across remounts of this same tab (e.g. navigating away and back) so a half-filled
  // "novo produto" form isn't lost — only File blobs can't survive an actual page reload.
  const initialDraft = mode === "create" ? getNewProductDraft() : null;
  const [loadingInitial, setLoadingInitial] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [pendingValues, setPendingValues] = useState<ProductFormValues | null>(null);
  const [images, setImages] = useState<ImageItem[]>(initialDraft?.images ?? []);
  const [originalImages, setOriginalImages] = useState<ExistingImage[]>([]);
  const [originalVariantIds, setOriginalVariantIds] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTitleSuggestion, setAiTitleSuggestion] = useState<string | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialDraft?.values ?? defaultProductFormValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "variants" });

  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
    if (mode === "create") setNewProductDraft({ values: form.getValues(), images });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, images]);

  useEffect(() => {
    if (mode !== "create") return;
    const subscription = form.watch((values) => {
      setNewProductDraft({ values: values as ProductFormValues, images: imagesRef.current });
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const title = form.watch("title");
  const description = form.watch("description");
  const categoryId = form.watch("categoryId");
  const seoKeywords = form.watch("seoKeywords") ?? [];

  async function runAiComplementa() {
    if (!title.trim()) {
      toast.error("Preencha o título antes de usar a IA complementa.");
      return;
    }

    setAiLoading(true);
    try {
      let categoryName: string | null = null;
      if (categoryId) {
        const { data } = await supabase
          .from("categories")
          .select("name")
          .eq("id", categoryId)
          .maybeSingle();
        categoryName = data?.name ?? null;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada. Faça login novamente.");

      const response = await fetch(
        `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1/product-seo-assist`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            title,
            description: description ?? "",
            categoryName,
            imageCount: images.length,
          }),
        },
      );

      const result = (await response.json()) as AiSuggestion & { error?: string };
      if (!response.ok || result.error) {
        throw new Error(result.error ?? "Erro ao consultar a IA.");
      }

      setAiTitleSuggestion(result.titleSuggestion);
      form.setValue("focusKeyword", result.focusKeyword);
      form.setValue("seoTitle", result.seoTitle);
      form.setValue("seoDescription", result.seoDescription);
      form.setValue("seoKeywords", result.seoKeywords);

      setImages((prev) =>
        prev.map((img, i) => ({ ...img, altText: result.imageAltTexts[i] ?? img.altText })),
      );

      toast.success("IA complementa: sugestões aplicadas. Confira a sugestão de título.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao consultar a IA.");
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    if (mode !== "edit" || !productId) return;
    const editingProductId = productId;

    async function loadProduct() {
      const { data: product, error } = await supabase
        .from("products")
        .select(
          "title, slug, description, video_url, status, category_id, ncm, origem, cfop_venda_mesmo_estado, cfop_venda_outros_estados, cfop_exportacao, csosn, cest, focus_keyword, seo_title, seo_description, seo_keywords",
        )
        .eq("id", editingProductId)
        .single();

      if (error || !product) {
        toast.error("Não foi possível carregar o produto.");
        setLoadingInitial(false);
        return;
      }

      const { data: variants } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", editingProductId)
        .order("created_at");

      const { data: productImages } = await supabase
        .from("product_images")
        .select("id, storage_path, alt_text, position")
        .eq("product_id", editingProductId)
        .order("position");

      form.reset({
        title: product.title,
        categoryId: product.category_id ?? "",
        description: product.description ?? "",
        videoUrl: product.video_url ?? "",
        status: product.status,
        variants: (variants ?? []).map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          gtinEan: v.gtin_ean ?? "",
          stockQuantity: String(v.stock_quantity),
          packageHeightCm: formatDecimalToInput(v.package_height_cm),
          packageWidthCm: formatDecimalToInput(v.package_width_cm),
          packageLengthCm: formatDecimalToInput(v.package_length_cm),
          packageWeightKg: formatDecimalToInput(v.package_weight_kg),
        })),
        ncm: product.ncm ?? "",
        origem: product.origem ?? "",
        cfopVendaMesmoEstado: product.cfop_venda_mesmo_estado ?? "",
        cfopVendaOutrosEstados: product.cfop_venda_outros_estados ?? "",
        cfopExportacao: product.cfop_exportacao ?? "",
        csosn: product.csosn ?? "",
        cest: product.cest ?? "",
        focusKeyword: product.focus_keyword ?? "",
        seoTitle: product.seo_title ?? "",
        seoDescription: product.seo_description ?? "",
        seoKeywords: product.seo_keywords ?? [],
      });
      setOriginalVariantIds((variants ?? []).map((v) => v.id));

      const existing = productImages ?? [];
      setOriginalImages(existing);
      setImages(
        existing.map((img) => ({
          key: img.id,
          existingId: img.id,
          storagePath: img.storage_path,
          altText: img.alt_text,
          previewUrl: supabase.storage.from("product-media").getPublicUrl(img.storage_path).data
            .publicUrl,
        })),
      );
      setLoadingInitial(false);
    }

    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, productId]);

  function handleAddFiles(fileList: FileList | null) {
    if (!fileList) return;
    const newItems: ImageItem[] = Array.from(fileList).map((file) => ({
      key: newKey(),
      file,
      previewUrl: URL.createObjectURL(file),
      altText: "",
    }));
    setImages((prev) => [...prev, ...newItems]);
  }

  function moveImage(key: string, direction: -1 | 1) {
    setImages((prev) => {
      const from = prev.findIndex((img) => img.key === key);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const moved = next[from]!;
      next[from] = next[to]!;
      next[to] = moved;
      return next;
    });
  }

  function makeCover(key: string) {
    setImages((prev) => {
      const from = prev.findIndex((img) => img.key === key);
      if (from <= 0) return prev;
      return [prev[from]!, ...prev.slice(0, from), ...prev.slice(from + 1)];
    });
  }

  function removeImage(key: string) {
    setImages((prev) => prev.filter((img) => img.key !== key));
  }

  async function saveProduct(values: ProductFormValues, chosenStatus: "draft" | "published") {
    if (images.length === 0) {
      toast.error("Adicione pelo menos uma foto do produto.");
      return;
    }

    setSaving(true);
    try {
      let currentProductId: string;
      const fiscalAndSeoPayload = {
        ncm: values.ncm || null,
        origem: values.origem || null,
        cfop_venda_mesmo_estado: values.cfopVendaMesmoEstado || null,
        cfop_venda_outros_estados: values.cfopVendaOutrosEstados || null,
        cfop_exportacao: values.cfopExportacao || null,
        csosn: values.csosn || null,
        cest: values.cest || null,
        focus_keyword: values.focusKeyword || null,
        seo_title: values.seoTitle || null,
        seo_description: values.seoDescription || null,
        seo_keywords: values.seoKeywords ?? [],
      };

      if (mode === "create") {
        const slug = await generateUniqueSlug(values.title);
        const { data, error } = await supabase
          .from("products")
          .insert({
            title: values.title,
            category_id: values.categoryId,
            description: values.description || null,
            video_url: values.videoUrl || null,
            status: chosenStatus,
            slug,
            ...fiscalAndSeoPayload,
          })
          .select("id")
          .single();
        if (error || !data) throw error ?? new Error("Falha ao criar produto.");
        currentProductId = data.id;
      } else {
        currentProductId = productId!;
        const { error } = await supabase
          .from("products")
          .update({
            title: values.title,
            category_id: values.categoryId,
            description: values.description || null,
            video_url: values.videoUrl || null,
            status: chosenStatus,
            ...fiscalAndSeoPayload,
          })
          .eq("id", currentProductId);
        if (error) throw error;
      }

      const currentVariantIds = new Set(values.variants.filter((v) => v.id).map((v) => v.id!));
      const variantIdsToDelete = originalVariantIds.filter((id) => !currentVariantIds.has(id));
      if (variantIdsToDelete.length > 0) {
        const { error } = await supabase
          .from("product_variants")
          .delete()
          .in("id", variantIdsToDelete);
        if (error) throw error;
      }

      for (const variant of values.variants) {
        const commonFields = {
          product_id: currentProductId,
          name: variant.name,
          sku: variant.sku,
          gtin_ean: variant.gtinEan || null,
          package_height_cm: parseDecimalInput(variant.packageHeightCm),
          package_width_cm: parseDecimalInput(variant.packageWidthCm),
          package_length_cm: parseDecimalInput(variant.packageLengthCm),
          package_weight_kg: parseDecimalInput(variant.packageWeightKg),
        };

        if (variant.id) {
          // Price lives in Admin > Anúncio > Precificação and stock in Admin > Anúncio > Estoque —
          // never touch either here, or an edit to name/frete would silently wipe out a value set
          // on those screens (stock is also debited automatically on every sale).
          const { error } = await supabase
            .from("product_variants")
            .update(commonFields)
            .eq("id", variant.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("product_variants")
            .insert({ ...commonFields, price_cents: 0, stock_quantity: 0, compare_at_price_cents: null });
          if (error) throw error;
        }
      }

      const currentImageDbIds = new Set(
        images.filter((img) => img.existingId).map((img) => img.existingId!),
      );
      const imagesToDelete = originalImages.filter((img) => !currentImageDbIds.has(img.id));
      for (const img of imagesToDelete) {
        await supabase.storage.from("product-media").remove([img.storage_path]);
        await supabase.from("product_images").delete().eq("id", img.id);
      }

      for (const [i, img] of images.entries()) {
        // Sem IA complementa, o alt cai pro título — nunca fica vazio, e a IA complementa
        // continua podendo melhorar isso depois (ver aviso de "faltando IA" no catálogo).
        const altText = img.altText.trim() || values.title;
        if (img.existingId) {
          const { error } = await supabase
            .from("product_images")
            .update({ alt_text: altText, position: i })
            .eq("id", img.existingId);
          if (error) throw error;
        } else if (img.file) {
          // Shrink and convert to WebP first; the file name is a fresh UUID, so it can be cached for a year.
          const prepared = await prepareProductImage(img.file);
          const path = `${currentProductId}/${crypto.randomUUID()}.${prepared.extension}`;
          const { error: uploadError } = await supabase.storage
            .from("product-media")
            .upload(path, prepared.body, {
              contentType: prepared.contentType,
              cacheControl: "31536000",
            });
          if (uploadError) throw uploadError;

          const { error: insertError } = await supabase.from("product_images").insert({
            product_id: currentProductId,
            storage_path: path,
            alt_text: altText,
            position: i,
          });
          if (insertError) throw insertError;
        }
      }

      if (mode === "create") clearNewProductDraft();
      toast.success(mode === "create" ? "Produto criado." : "Produto atualizado.");
      router.navigate({ to: "/admin/catalogo" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar o produto.");
    } finally {
      setSaving(false);
      setPendingValues(null);
    }
  }

  if (loadingInitial) {
    return <p className="text-sm text-muted-foreground">Carregando produto...</p>;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => setPendingValues(values))}
        className="space-y-6"
      >
        <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed bg-muted/30 p-4">
          <div>
            <p className="text-sm font-medium text-[#12294f]">IA complementa</p>
            <p className="text-xs text-muted-foreground">
              Pesquisa os melhores termos de SEO para este anúncio e preenche automaticamente
              palavra-chave de foco, meta título/descrição, termos de busca e o texto alternativo
              das fotos. O título só é atualizado se você aceitar a sugestão.
            </p>
          </div>
          <Button type="button" variant="secondary" disabled={aiLoading} onClick={runAiComplementa}>
            <Sparkles className="mr-2 h-4 w-4" />
            {aiLoading ? "Analisando..." : "IA complementa"}
          </Button>
        </div>

        <Tabs defaultValue="basico">
          <TabsList>
            <TabsTrigger value="basico">Básico</TabsTrigger>
            <TabsTrigger value="midia">Mídia</TabsTrigger>
            <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
            <TabsTrigger value="variacoes">Variações ({fields.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="basico" className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-1.5">
                    <FormLabel>Título ({title?.length ?? 0}/60)</FormLabel>
                    {aiTitleSuggestion && aiTitleSuggestion !== field.value ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="text-amber-500 hover:text-amber-600"
                            aria-label="Sugestão de título da IA"
                          >
                            <Sparkles className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Sugestão de título (SEO)
                          </p>
                          <p className="text-sm">{aiTitleSuggestion}</p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              field.onChange(aiTitleSuggestion);
                              setAiTitleSuggestion(null);
                            }}
                          >
                            Usar sugestão
                          </Button>
                        </PopoverContent>
                      </Popover>
                    ) : null}
                  </div>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={60}
                      placeholder="Ex: Tábua de Madeira para Frios"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <CategorySelect value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={6} placeholder="Descreva o produto..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="videoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vídeo (URL do YouTube, Vimeo, etc.)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium text-[#12294f]">
                SEO (preenchido pela IA complementa)
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="focusKeyword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Palavra-chave de foco</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: tábua de madeira para frios" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="seoTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">SEO title (meta título)</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={60} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="seoDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">SEO description (meta descrição)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} maxLength={160} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {seoKeywords.length > 0 ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Termos de busca relacionados
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {seoKeywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="midia" className="space-y-4">
            <div>
              <Label htmlFor="product-photos">Fotos</Label>
              <Input
                id="product-photos"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => handleAddFiles(event.target.files)}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                O texto alternativo (alt) de cada foto é gerado pela IA complementa. Sem isso, o
                produto salva usando o título como alt e fica marcado com um ⚠ no catálogo até você
                complementar.
              </p>
            </div>

            {images.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma foto adicionada ainda.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {images.map((img, index) => (
                  <Card key={img.key}>
                    <CardContent className="flex gap-3 p-3">
                      <img
                        src={img.previewUrl}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded object-cover"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Texto alternativo (alt)</Label>
                          {index === 0 ? <Badge>Capa</Badge> : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {img.altText || "Ainda não complementado — vai salvar usando o título."}
                        </p>
                        <div className="flex items-center gap-1 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={index === 0}
                            onClick={() => moveImage(img.key, -1)}
                            aria-label="Mover para antes"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={index === images.length - 1}
                            onClick={() => moveImage(img.key, 1)}
                            aria-label="Mover para depois"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                          {index > 0 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => makeCover(img.key)}
                            >
                              Tornar capa
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeImage(img.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="fiscal" className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Dados fiscais do produto — armazenados para uso futuro na emissão de nota fiscal. Um
              único conjunto de valores vale para todas as variações deste produto.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="ncm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NCM</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="origem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="csosn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CSOSN</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEST</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cfopVendaMesmoEstado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CFOP venda mesmo estado</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cfopVendaOutrosEstados"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CFOP venda outros estados</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cfopExportacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CFOP exportação</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="variacoes" className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Preço não é definido aqui — ajuste em{" "}
              <span className="font-medium text-[#12294f]">Admin &gt; Precificação</span> depois de
              publicar o produto. Nome, SKU, dimensões e peso do pacote abaixo são o que o Melhor
              Envio usa para calcular o frete.
            </p>
            {fields.map((field, index) => (
              <Card key={field.id}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                      <FormField
                        control={form.control}
                        name={`variants.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Nome da variação</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: Azul / P" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${index}.sku`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="ALNA-0001" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${index}.gtinEan`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GTIN / EAN</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="7891234567890" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Accordion type="single" collapsible>
                    <AccordionItem value="envio">
                      <AccordionTrigger className="text-sm">Envio</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div>
                          <p className="mb-2 text-xs font-medium text-muted-foreground">
                            Dimensões e peso do pacote — usados no cálculo de frete via Melhor
                            Envio.{" "}
                            <span className="text-amber-600">
                              Cálculo automático pendente: falta configurar a credencial da API do
                              Melhor Envio.
                            </span>
                          </p>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <FormField
                              control={form.control}
                              name={`variants.${index}.packageHeightCm`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Altura (cm)</FormLabel>
                                  <FormControl>
                                    <Input {...field} inputMode="decimal" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`variants.${index}.packageWidthCm`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Largura (cm)</FormLabel>
                                  <FormControl>
                                    <Input {...field} inputMode="decimal" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`variants.${index}.packageLengthCm`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Comprimento (cm)</FormLabel>
                                  <FormControl>
                                    <Input {...field} inputMode="decimal" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`variants.${index}.packageWeightKg`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Peso (kg)</FormLabel>
                                  <FormControl>
                                    <Input {...field} inputMode="decimal" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            ))}

            <Button type="button" variant="outline" onClick={() => append(emptyVariant)}>
              + Adicionar variação
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (mode === "create") clearNewProductDraft();
              router.navigate({ to: "/admin/catalogo" });
            }}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {mode === "create" ? "Criar produto" : "Salvar alterações"}
          </Button>
        </div>
      </form>

      <Dialog
        open={pendingValues !== null}
        onOpenChange={(open) => !open && !saving && setPendingValues(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>O que deseja fazer?</DialogTitle>
            <DialogDescription>
              Publicado aparece na loja; rascunho fica salvo só aqui no painel.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => pendingValues && saveProduct(pendingValues, "draft")}
            >
              Salvar como rascunho
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => pendingValues && saveProduct(pendingValues, "published")}
            >
              {saving ? "Salvando..." : "Publicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
