import type { ProductFormValues } from "./product-schema";

// A photo's File can't survive a hard page reload (the browser won't let JS keep a handle across
// that), so this draft only lives in memory for as long as the admin tab stays open — enough to
// survive navigating to another screen and back, which is the actual complaint this fixes.
export type ProductDraftImage = {
  key: string;
  file?: File;
  previewUrl: string;
  altText: string;
  storagePath?: string;
  existingId?: string;
};

export type ProductDraft = {
  values: ProductFormValues;
  images: ProductDraftImage[];
};

let draft: ProductDraft | null = null;

export function getNewProductDraft(): ProductDraft | null {
  return draft;
}

export function setNewProductDraft(next: ProductDraft): void {
  draft = next;
}

export function clearNewProductDraft(): void {
  draft = null;
}
