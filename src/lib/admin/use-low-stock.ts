import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const LOW_STOCK_THRESHOLD = 5;
const STOCK_CHANGED_EVENT = "alna:stock-changed";

export function notifyStockChanged() {
  window.dispatchEvent(new Event(STOCK_CHANGED_EVENT));
}

// How many SKUs are below the alert threshold — drives the red "?" beside Admin > Anúncio > Estoque.
export function useLowStockCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const { count: lowCount, error } = await supabase
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .lt("stock_quantity", LOW_STOCK_THRESHOLD);
    if (!error) setCount(lowCount ?? 0);
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener(STOCK_CHANGED_EVENT, refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(STOCK_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return count;
}
