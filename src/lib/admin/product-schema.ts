import { z } from "zod";

export const variantFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Informe o nome da variação"),
  sku: z.string().min(1, "Informe o SKU"),
  gtinEan: z.string().optional(),
  stockQuantity: z.string().optional(),
  packageHeightCm: z.string().optional(),
  packageWidthCm: z.string().optional(),
  packageLengthCm: z.string().optional(),
  packageWeightKg: z.string().optional(),
});

export const productFormSchema = z.object({
  title: z.string().trim().min(1, "Informe o título").max(60, "O título deve ter no máximo 60 caracteres"),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  description: z.string().optional(),
  videoUrl: z.string().trim().url("Informe uma URL válida").optional().or(z.literal("")),
  status: z.enum(["draft", "published"]),
  variants: z.array(variantFormSchema).min(1, "Adicione pelo menos uma variação"),
  // Fiscal — um único conjunto de dados para o produto, aplicado a todas as variações.
  ncm: z.string().optional(),
  origem: z.string().optional(),
  cfopVendaMesmoEstado: z.string().optional(),
  cfopVendaOutrosEstados: z.string().optional(),
  cfopExportacao: z.string().optional(),
  csosn: z.string().optional(),
  cest: z.string().optional(),
  // SEO — preenchido automaticamente pelo botão "IA complementa".
  focusKeyword: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.array(z.string()).optional(),
});

export type VariantFormValues = z.infer<typeof variantFormSchema>;
export type ProductFormValues = z.infer<typeof productFormSchema>;

export const emptyVariant: VariantFormValues = {
  name: "",
  sku: "",
  gtinEan: "",
  stockQuantity: "0",
  packageHeightCm: "",
  packageWidthCm: "",
  packageLengthCm: "",
  packageWeightKg: "",
};

export const defaultProductFormValues: ProductFormValues = {
  title: "",
  categoryId: "",
  description: "",
  videoUrl: "",
  status: "draft",
  variants: [emptyVariant],
  // Defaults usuais da ALNA — a maioria dos produtos usa exatamente estes códigos;
  // o admin ajusta manualmente só quando um produto específico for diferente.
  ncm: "",
  origem: "0",
  cfopVendaMesmoEstado: "5102",
  cfopVendaOutrosEstados: "6102",
  cfopExportacao: "7102",
  csosn: "102",
  cest: "0000000",
  focusKeyword: "",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: [],
};
