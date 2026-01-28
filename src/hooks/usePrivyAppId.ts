import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type PrivyAppIdState = {
  appId: string | null;
  loading: boolean;
};

export function usePrivyAppId(): PrivyAppIdState {
  const envAppId = (import.meta.env.VITE_PRIVY_APP_ID as string | undefined) ?? null;

  const [state, setState] = useState<PrivyAppIdState>({
    appId: envAppId,
    loading: !envAppId,
  });

  useEffect(() => {
    if (envAppId) {
      setState({ appId: envAppId, loading: false });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("public-config");
        if (cancelled) return;
        if (error) throw error;

        setState({
          appId: (data as { privyAppId?: string | null } | null)?.privyAppId ?? null,
          loading: false,
        });
      } catch {
        if (cancelled) return;
        setState({ appId: null, loading: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [envAppId]);

  return state;
}
