import { useEffect } from "react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

type PrivyLoginButtonProps = {
  active: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  label?: string;
  onStart: () => void;
  onAuthenticated: (args: {
    privyUserId: string;
    email?: string;
    walletAddress?: string;
  }) => Promise<boolean>;
};

export function PrivyLoginButton({
  active,
  disabled,
  isLoading,
  className,
  label = "Sign in with Email",
  onStart,
  onAuthenticated,
}: PrivyLoginButtonProps) {
  const { authenticated, user, logout } = usePrivy();

  const { login } = useLogin({
    onComplete: () => {
      // handled by the effect below
    },
    onError: (error: unknown) => {
      console.error("Privy login error:", error);
      toast.error("Login failed");
    },
  });

  useEffect(() => {
    if (!active) return;
    if (!authenticated || !user) return;

    const email = user.email?.address;
    const walletAddress = user.wallet?.address;

    onAuthenticated({
      privyUserId: user.id,
      email,
      walletAddress,
    }).then((ok) => {
      if (!ok) logout();
    });
  }, [active, authenticated, user, onAuthenticated, logout]);

  return (
    <Button
      onClick={() => {
        onStart();
        login();
      }}
      className={className}
      disabled={disabled}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Signing in...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <span>{label}</span>
        </div>
      )}
    </Button>
  );
}
