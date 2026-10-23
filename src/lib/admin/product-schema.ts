import { z } from "zod";

export const variantFormSchema = z.object({
  id: z.string().optional(),
  // Chave só do formulário (identifica a primária antes de ser salva, para a secundária apontar para ela).
  localKey: z.string().optional(),
  name: z.string().min(1, "Informe o nome da variação"),
  // SKU é obrigatório só quando a variação se vende (sem secundárias). A regra fica em productFormSchema.
  sku: z.string().optional(),
  gtinEan: z.string().optional(),
  stockQuantity: z.string().optional(),
});

// Variação secundária: liga-se a uma primária (parentKey = localKey dela) e pode ter foto de capa (coverKey = chave da foto).
export const secondaryVariantFormSchema = variantFormSchema.extend({
  sku: z.string().trim().min(1, "Informe o SKU da variação secundária"),
  parentKey: z.string().min(1, "Relacione a variação com uma primária"),
  coverKey: z.string().optional(),
});

export const productFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Informe o título")
    .max(60, "O título deve ter no máximo 60 caracteres"),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  description: z.string().optional(),
  status: z.enum(["draft", "published"]),
  variants: z.array(variantFormSchema).min(1, "Adicione pelo menos uma variação"),
  secondaryVariants: z.array(secondaryVariantFormSchema).optional(),
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
}).superRefine((valores, ctx) => {
  // Primária que tem secundárias não precisa de SKU: a venda usa o SKU da secundária.
  // Primária sem secundárias é a própria variação vendida, então o SKU é obrigatório.
  valores.variants.forEach((v, i) => {
    const temSecundaria = (valores.secondaryVariants ?? []).some((s) => s.parentKey === v.localKey);
    if (!temSecundaria && !(v.sku ?? "").trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["variants", i, "sku"], message: "Informe o SKU" });
    }
  });
});

export type VariantFormValues = z.infer<typeof variantFormSchema>;
export type SecondaryVariantFormValues = z.infer<typeof secondaryVariantFormSchema>;
export type ProductFormValues = z.infer<typeof productFormSchema>;

export const emptyVariant: VariantFormValues = {
  name: "",
  sku: "",
  gtinEan: "",
  stockQuantity: "0",
};

export const emptySecondaryVariant: SecondaryVariantFormValues = {
  ...emptyVariant,
  sku: "",
  parentKey: "",
  coverKey: "",
};

export const defaultProductFormValues: ProductFormValues = {
  title: "",
  categoryId: "",
  description: "",
  status: "draft",
  variants: [emptyVariant],
  secondaryVariants: [],
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
