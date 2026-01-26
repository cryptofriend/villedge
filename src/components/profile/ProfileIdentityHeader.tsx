import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, ExternalLink, Edit2, Save, X, Twitter, Github, Linkedin, Instagram, Globe, Wallet } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfileData } from "@/pages/Profile";
import { format } from "date-fns";
import { useAccount } from "wagmi";
import { useTonWallet } from "@tonconnect/ui-react";
import { usePersonalBalance } from "@/hooks/usePersonalBalance";
import { PersonalTopUpDialog } from "@/components/PersonalTopUpDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ProfileIdentityHeaderProps {
  profile: ProfileData;
  isOwnProfile: boolean;
  onProfileUpdate?: (updates: Partial<ProfileData>) => void;
}

// Detect social platform from URL
const getSocialPlatform = (url: string) => {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) {
    return { platform: "twitter", icon: Twitter, color: "text-sky-500" };
  }
  if (lowerUrl.includes("github.com")) {
    return { platform: "github", icon: Github, color: "text-foreground" };
  }
  if (lowerUrl.includes("linkedin.com")) {
    return { platform: "linkedin", icon: Linkedin, color: "text-blue-600" };
  }
  if (lowerUrl.includes("instagram.com")) {
    return { platform: "instagram", icon: Instagram, color: "text-pink-500" };
  }
  if (url.startsWith("http")) {
    return { platform: "website", icon: Globe, color: "text-muted-foreground" };
  }
  return null;
};

export const ProfileIdentityHeader = ({ profile, isOwnProfile, onProfileUpdate }: ProfileIdentityHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { address: evmAddress } = useAccount();
  const tonWallet = useTonWallet();
  
  // Use the primary connected wallet for balance
  const tonAddress = tonWallet?.account?.address;
  const activeAddress = evmAddress || tonAddress;
  
  const { balance, isLoading: isLoadingBalance } = usePersonalBalance(activeAddress);
  
  const [copied, setCopied] = useState(false);
  const [walletExpanded, setWalletExpanded] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editUsername, setEditUsername] = useState(profile.username || "");
  const [isSaving, setIsSaving] = useState(false);

  const socialPlatform = getSocialPlatform(profile.social_url || "");
  const joinDate = new Date(profile.created_at);
  const isGenesisMember = joinDate < new Date("2025-02-01");

  const copyAddress = () => {
    if (activeAddress) {
      navigator.clipboard.writeText(activeAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncatedAddress = activeAddress
    ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
    : "";

  const handleSaveUsername = async () => {
    if (!user || !editUsername.trim()) return;
    
    // Validate username format
    const usernameRegex = /^[a-z0-9-]+$/;
    const cleanUsername = editUsername.trim().toLowerCase();
    
    if (!usernameRegex.test(cleanUsername)) {
      toast.error("Username can only contain lowercase letters, numbers, and hyphens");
      return;
    }
    
    if (cleanUsername.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    
    if (cleanUsername.length > 30) {
      toast.error("Username must be 30 characters or less");
      return;
    }

    setIsSaving(true);
    try {
      // Check if username is already taken
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .neq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast.error("Username is already taken");
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ username: cleanUsername })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Username updated!");
      setIsEditingUsername(false);
      onProfileUpdate?.({ username: cleanUsername });
      
      // Navigate to new URL
      navigate(`/profile/${cleanUsername}`, { replace: true });
    } catch (error) {
      console.error("Error updating username:", error);
      toast.error("Failed to update username");
    } finally {
      setIsSaving(false);
    }
  };

  const getExplorerUrl = () => {
    if (evmAddress) {
      return `https://basescan.org/address/${evmAddress}`;
    }
    if (tonAddress) {
      return `https://tonscan.org/address/${tonAddress}`;
    }
    return "#";
  };

  const getChainBadge = () => {
    if (evmAddress) {
      return (
        <Badge variant="secondary" className="bg-blue-600/10 text-blue-600 border-blue-600/20 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1" />
          Base
        </Badge>
      );
    }
    if (tonAddress) {
      return (
        <Badge variant="secondary" className="bg-sky-500/10 text-sky-500 border-sky-500/20 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1" />
          TON
        </Badge>
      );
    }
    return null;
  };

  return (
    <section className="relative pb-6 border-b border-border">
      {/* Background pattern for passport feel */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 20px,
            hsl(var(--foreground)) 20px,
            hsl(var(--foreground)) 21px
          )`
        }} />
      </div>

      <div className="relative flex items-start gap-6">
        {/* Large Avatar */}
        <div className="relative">
          <Avatar className="h-28 w-28 ring-4 ring-primary/20 shadow-elevated">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || "User"} />
            <AvatarFallback className="bg-primary/10 text-primary text-3xl font-display">
              {(profile.display_name || "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isGenesisMember && (
            <div className="absolute -bottom-1 -right-1 bg-accent text-accent-foreground text-[10px] px-2 py-0.5 rounded-full font-medium shadow-sm">
              Genesis
            </div>
          )}
        </div>

        {/* Identity Info */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {/* Display Name */}
              <h1 className="text-3xl font-display font-semibold text-foreground truncate">
                {profile.display_name || "Anonymous"}
              </h1>

              {/* Editable Username */}
              <div className="flex items-center gap-2 mt-1">
                {isEditingUsername ? (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">@</span>
                    <Input
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="h-7 w-40 text-sm"
                      placeholder="username"
                      maxLength={30}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={handleSaveUsername}
                      disabled={isSaving}
                    >
                      <Save className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setIsEditingUsername(false);
                        setEditUsername(profile.username || "");
                      }}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">@{profile.username || "—"}</span>
                    {isOwnProfile && (
                      <button
                        onClick={() => setIsEditingUsername(true)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="Edit username"
                      >
                        <Edit2 className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Title / Role */}
              {profile.project_description && (
                <p className="text-base text-muted-foreground mt-1 truncate">
                  {profile.project_description.slice(0, 60)}
                </p>
              )}

              {/* Social Link */}
              {socialPlatform && profile.social_url && (
                <a
                  href={profile.social_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 mt-2 text-sm hover:underline ${socialPlatform.color}`}
                >
                  <socialPlatform.icon className="h-4 w-4" />
                  <span className="truncate max-w-[200px]">
                    {profile.social_url.replace(/https?:\/\/(www\.)?/, "").split("/")[1] || profile.social_url}
                  </span>
                </a>
              )}
            </div>
          </div>

          {/* Join Date */}
          <div className="flex items-center gap-3 mt-4 text-sm text-muted-foreground">
            <span>Member since {format(joinDate, "MMM yyyy")}</span>
          </div>

          {/* Wallet Section with Balance */}
          {activeAddress && (
            <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setWalletExpanded(!walletExpanded)}
                  className="flex items-center gap-2 text-sm font-mono text-foreground hover:text-primary transition-colors"
                >
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  {walletExpanded ? activeAddress : truncatedAddress}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyAddress}
                    className="p-1.5 hover:bg-muted rounded transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <a
                    href={getExplorerUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-muted rounded transition-colors"
                    title="View on explorer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </div>
              </div>

              {/* Balance & Chain */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  {isLoadingBalance ? (
                    <span className="text-sm text-muted-foreground">Loading balance...</span>
                  ) : (
                    <span className="text-lg font-semibold text-foreground">
                      ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                  {isOwnProfile && evmAddress && <PersonalTopUpDialog walletAddress={evmAddress} />}
                </div>
                {getChainBadge()}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
