import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ProfileVerificationSectionProps {
  isVerified: boolean;
  isOwnProfile: boolean;
}

export const ProfileVerificationSection = ({ isVerified, isOwnProfile }: ProfileVerificationSectionProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Don't show anything if not own profile or already verified
  if (!isOwnProfile) return null;
  
  if (isVerified) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Verified Member</CardTitle>
            <Badge variant="default" className="ml-auto">Verified</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You have full access to all village features.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !user?.id) return;

    setIsSubmitting(true);
    try {
      // Validate the invitation code
      const { data: validationResult, error: validationError } = await supabase
        .rpc('validate_invitation_code', { _code: code.trim().toUpperCase() });

      if (validationError) throw validationError;

      const result = validationResult as { valid: boolean; error?: string; code_id?: string; owner_id?: string };

      if (!result.valid) {
        toast.error(result.error || "Invalid invitation code");
        return;
      }

      // Use the invitation code
      const { error: useError } = await supabase
        .rpc('use_invitation_code', {
          _code_id: result.code_id,
          _referrer_id: result.owner_id,
          _referred_id: user.id,
        });

      if (useError) throw useError;

      toast.success("Welcome! You are now verified and have full access.");
      setCode("");
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      // Refresh the page to update verification status
      window.location.reload();
    } catch (error) {
      console.error("Error using invitation code:", error);
      toast.error("Failed to verify. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-lg">Get Verified</CardTitle>
          <Badge variant="outline" className="ml-auto border-amber-500/50 text-amber-600">
            Limited Access
          </Badge>
        </div>
        <CardDescription>
          Enter an invitation code from a verified member to unlock full access to all village features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Enter invitation code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono tracking-wider uppercase"
            maxLength={8}
            disabled={isSubmitting}
          />
          <Button type="submit" disabled={!code.trim() || isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Verify"
            )}
          </Button>
        </form>
        
        <p className="text-sm text-muted-foreground">
          Don't have a code?{" "}
          <a
            href="https://x.com/boogaav"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            DM @boogaav
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </CardContent>
    </Card>
  );
};
