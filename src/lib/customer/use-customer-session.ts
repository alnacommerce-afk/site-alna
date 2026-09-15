import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type CustomerSessionStatus = "loading" | "authenticated" | "signed-out";

export function useCustomerSession() {
  const [status, setStatus] = useState<CustomerSessionStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setStatus(data.session?.user ? "authenticated" : "signed-out");
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      setStatus(newSession?.user ? "authenticated" : "signed-out");
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { status, session };
}
