import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

// Data the header, footer and cart all need. Shared query keys mean one request per page (instead of
// one per component) and the answer is reused while the visitor browses the store.
const STALE_MS = 10 * 60 * 1000;

export type NavCategory = { id: string; name: string; slug: string };

export type SiteSettings = {
  free_shipping_threshold_cents: number;
  cnpj: string | null;
  razao_social: string | null;
  phone: string | null;
  email: string | null;
  instagram_handle: string | null;
  address_city: string | null;
  address_state: string | null;
  business_hours: string | null;
};

export function useCategories() {
  return useQuery({
    queryKey: ["site", "categories"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<NavCategory[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site", "settings"],
    staleTime: STALE_MS,
    queryFn: async (): Promise<SiteSettings | null> => {
      const { data, error } = await supabase
        .from("site_settings")
        .select(
          "free_shipping_threshold_cents, cnpj, razao_social, phone, email, instagram_handle, address_city, address_state, business_hours",
        )
        .eq("id", "default")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
