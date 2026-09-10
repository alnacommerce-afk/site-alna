import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  formatCentsToInput,
  formatDecimalToInput,
  parseCentsFromInput,
  parseDecimalInput,
  slugify,
} from "@/lib/money";
import {
  defaultProductFormValues,
  emptyVariant,
  productFormSchema,
  type ProductFormValues,
} from "@/lib/admin/product-schema";
import { CategorySelect } from "@/components/admin/category-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type ImageItem = {
  key: string;
  file?: File;
  previewUrl: string;
  altText: string;
  storagePath?: string;
  existingId?: string;
};

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
  const [loadingInitial, setLoadingInitial] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [originalImages, setOriginalImages] = useState<ExistingImage[]>([]);
  const [originalVariantIds, setOriginalVariantIds] = useState<string[]>([]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultProductFormValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "variants" });
  const title = form.watch("title");

  useEffect(() => {
    if (mode !== "edit" || !productId) return;
    const editingProductId = productId;

    async function loadProduct() {
      const { data: product, error } = await supabase
        .from("products")
        .select("title, slug, description, video_url, status, category_id")
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
          price: formatCentsToInput(v.price_cents),
          compareAtPrice: formatCentsToInput(v.compare_at_price_cents),
          sku: v.sku,
          gtinEan: v.gtin_ean ?? "",
          stockQuantity: String(v.stock_quantity),
          packageHeightCm: formatDecimalToInput(v.package_height_cm),
          packageWidthCm: formatDecimalToInput(v.package_width_cm),
          packageLengthCm: formatDecimalToInput(v.package_length_cm),
          packageWeightKg: formatDecimalToInput(v.package_weight_kg),
          ncm: v.ncm ?? "",
          origem: v.origem ?? "",
          cfopVendaMesmoEstado: v.cfop_venda_mesmo_estado ?? "",
          cfopVendaOutrosEstados: v.cfop_venda_outros_estados ?? "",
          cfopExportacao: v.cfop_exportacao ?? "",
          csosn: v.csosn ?? "",
          cest: v.cest ?? "",
        })),
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

  function updateImageAlt(key: string, altText: string) {
    setImages((prev) => prev.map((img) => (img.key === key ? { ...img, altText } : img)));
  }

  function removeImage(key: string) {
    setImages((prev) => prev.filter((img) => img.key !== key));
  }

  async function onSubmit(values: ProductFormValues) {
    if (images.length === 0) {
      toast.error("Adicione pelo menos uma foto do produto.");
      return;
    }
    if (images.some((img) => !img.altText.trim())) {
      toast.error('Preencha o texto alternativo ("alt") de todas as fotos.');
      return;
    }

    setSaving(true);
    try {
      let currentProductId: string;

      if (mode === "create") {
        const slug = await generateUniqueSlug(values.title);
        const { data, error } = await supabase
          .from("products")
          .insert({
            title: values.title,
            category_id: values.categoryId,
            description: values.description || null,
            video_url: values.videoUrl || null,
            status: values.status,
            slug,
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
            status: values.status,
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
        const payload = {
          product_id: currentProductId,
          name: variant.name,
          sku: variant.sku,
          gtin_ean: variant.gtinEan || null,
          price_cents: parseCentsFromInput(variant.price),
          compare_at_price_cents: variant.compareAtPrice
            ? parseCentsFromInput(variant.compareAtPrice)
            : null,
          stock_quantity: Number.parseInt(variant.stockQuantity ?? "0", 10) || 0,
          package_height_cm: parseDecimalInput(variant.packageHeightCm),
          package_width_cm: parseDecimalInput(variant.packageWidthCm),
          package_length_cm: parseDecimalInput(variant.packageLengthCm),
          package_weight_kg: parseDecimalInput(variant.packageWeightKg),
          ncm: variant.ncm || null,
          origem: variant.origem || null,
          cfop_venda_mesmo_estado: variant.cfopVendaMesmoEstado || null,
          cfop_venda_outros_estados: variant.cfopVendaOutrosEstados || null,
          cfop_exportacao: variant.cfopExportacao || null,
          csosn: variant.csosn || null,
          cest: variant.cest || null,
        };

        if (variant.id) {
          const { error } = await supabase
            .from("product_variants")
            .update(payload)
            .eq("id", variant.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("product_variants").insert(payload);
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
        if (img.existingId) {
          const { error } = await supabase
            .from("product_images")
            .update({ alt_text: img.altText, position: i })
            .eq("id", img.existingId);
          if (error) throw error;
        } else if (img.file) {
          const extension = img.file.name.split(".").pop() || "jpg";
          const path = `${currentProductId}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from("product-media")
            .upload(path, img.file);
          if (uploadError) throw uploadError;

          const { error: insertError } = await supabase.from("product_images").insert({
            product_id: currentProductId,
            storage_path: path,
            alt_text: img.altText,
            position: i,
          });
          if (insertError) throw insertError;
        }
      }

      toast.success(mode === "create" ? "Produto criado." : "Produto atualizado.");
      router.navigate({ to: "/admin/catalogo" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar o produto.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingInitial) {
    return <p className="text-sm text-muted-foreground">Carregando produto...</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basico">
          <TabsList>
            <TabsTrigger value="basico">Básico</TabsTrigger>
            <TabsTrigger value="midia">Mídia</TabsTrigger>
            <TabsTrigger value="variacoes">Variações ({fields.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="basico" className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título ({title?.length ?? 0}/60)</FormLabel>
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

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                O texto alternativo (alt) é obrigatório em cada foto para melhorar o SEO de imagens.
              </p>
            </div>

            {images.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma foto adicionada ainda.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {images.map((img) => (
                  <Card key={img.key}>
                    <CardContent className="flex gap-3 p-3">
                      <img
                        src={img.previewUrl}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded object-cover"
                      />
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Texto alternativo (alt)</Label>
                        <Input
                          value={img.altText}
                          onChange={(event) => updateImageAlt(img.key, event.target.value)}
                          placeholder="Ex: Tábua de madeira redonda para frios"
                        />
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

          <TabsContent value="variacoes" className="space-y-4">
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
                        name={`variants.${index}.price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preço (R$)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="18,90" inputMode="decimal" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`variants.${index}.compareAtPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preço "de" (opcional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="23,58" inputMode="decimal" />
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
                      <FormField
                        control={form.control}
                        name={`variants.${index}.stockQuantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estoque</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" min={0} />
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
                    <AccordionItem value="envio-fiscal">
                      <AccordionTrigger className="text-sm">Envio e dados fiscais</AccordionTrigger>
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

                        <div>
                          <p className="mb-2 text-xs font-medium text-muted-foreground">
                            Dados fiscais — armazenados para uso futuro na emissão de nota fiscal.
                          </p>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <FormField
                              control={form.control}
                              name={`variants.${index}.ncm`}
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
                              name={`variants.${index}.origem`}
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
                              name={`variants.${index}.csosn`}
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
                              name={`variants.${index}.cest`}
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
                              name={`variants.${index}.cfopVendaMesmoEstado`}
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
                              name={`variants.${index}.cfopVendaOutrosEstados`}
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
                              name={`variants.${index}.cfopExportacao`}
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
            onClick={() => router.navigate({ to: "/admin/catalogo" })}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : mode === "create" ? "Criar produto" : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
