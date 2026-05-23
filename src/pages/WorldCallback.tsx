import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function WorldCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      const code = params.get("code");
      const state = params.get("state");
      const errParam = params.get("error");
      const returnTo = sessionStorage.getItem("world_id_return_to") || "/";
      const expectedState = sessionStorage.getItem("world_id_state");

      if (errParam) {
        toast.error(`World ID: ${errParam}`);
        navigate(returnTo, { replace: true });
        return;
      }
      if (!code) {
        setError("Missing code");
        return;
      }
      if (state && expectedState && state !== expectedState) {
        setError("State mismatch");
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/auth/world-callback`;
        const { data, error } = await supabase.functions.invoke("world-id-auth", {
          body: { code, redirect_uri: redirectUri },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);

        if (data?.actionLink) {
          const url = new URL(data.actionLink);
          const token = url.searchParams.get("token");
          const tokenType = url.searchParams.get("type");
          if (token && tokenType) {
            const { error: sessionError } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: tokenType as "magiclink",
            });
            if (sessionError) throw sessionError;
          }
          toast.success("Welcome to Villedge!");
        }

        sessionStorage.removeItem("world_id_state");
        sessionStorage.removeItem("world_id_nonce");
        sessionStorage.removeItem("world_id_return_to");
        navigate(returnTo, { replace: true });
      } catch (e) {
        console.error("World ID callback error:", e);
        const msg = e instanceof Error ? e.message : "Authentication failed";
        setError(msg);
        toast.error(msg);
      }
    };

    run();
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {error ? (
        <div className="text-center space-y-2">
          <p className="text-destructive">{error}</p>
          <button onClick={() => navigate("/")} className="text-sm underline text-muted-foreground">
            Back to map
          </button>
        </div>
      ) : (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      )}
    </div>
  );
}
