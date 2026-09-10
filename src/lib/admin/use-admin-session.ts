import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AdminSessionStatus = "loading" | "authenticated" | "unauthorized" | "signed-out";

export function useAdminSession() {
  const [status, setStatus] = useState<AdminSessionStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;

    async function checkAdminRole(userId: string) {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!active) return;
      setStatus(!error && data ? "authenticated" : "unauthorized");
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        checkAdminRole(data.session.user.id);
      } else {
        setStatus("signed-out");
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      if (newSession?.user) {
        setStatus("loading");
        checkAdminRole(newSession.user.id);
      } else {
        setStatus("signed-out");
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { status, session };
}
