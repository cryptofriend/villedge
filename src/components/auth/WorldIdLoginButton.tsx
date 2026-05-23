import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface WorldIdLoginButtonProps {
  disabled?: boolean;
  isLoading?: boolean;
  onStart?: () => void;
}

const WORLD_ID_APP_ID = import.meta.env.VITE_WORLD_ID_APP_ID as string;

export function WorldIdLoginButton({ disabled, isLoading, onStart }: WorldIdLoginButtonProps) {
  const handleClick = () => {
    onStart?.();
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    sessionStorage.setItem("world_id_state", state);
    sessionStorage.setItem("world_id_nonce", nonce);
    sessionStorage.setItem("world_id_return_to", window.location.pathname + window.location.search);

    const redirectUri = `${window.location.origin}/auth/world-callback`;
    const params = new URLSearchParams({
      client_id: WORLD_ID_APP_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid",
      state,
      nonce,
    });
    window.location.href = `https://id.worldcoin.org/authorize?${params.toString()}`;
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className="w-full h-14 text-base font-medium bg-foreground hover:bg-foreground/90 text-background rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span>World ID</span>
        </div>
      )}
    </Button>
  );
}
