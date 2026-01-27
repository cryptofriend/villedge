import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, ExternalLink, Edit2, Save, X, Twitter, Github, Linkedin, Instagram, Globe, Wallet, Link } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfileData } from "@/pages/Profile";
import { ProfileAvatarUpload } from "./ProfileAvatarUpload";
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

// Parse social URL to extract handle
const getSocialHandle = (url: string) => {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    return pathParts[0] || parsed.hostname;
  } catch {
    return url;
  }
};

export const ProfileIdentityHeader = ({ profile, isOwnProfile, onProfileUpdate }: ProfileIdentityHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { address: evmAddress } = useAccount();
  const tonWallet = useTonWallet();
  
  const tonAddress = tonWallet?.account?.address;
  const activeAddress = evmAddress || tonAddress;
  
  const { balance, isLoading: isLoadingBalance } = usePersonalBalance(activeAddress);
  
  const [copied, setCopied] = useState(false);
  const [walletExpanded, setWalletExpanded] = useState(false);
  
  // Editing states
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingSocial, setIsEditingSocial] = useState(false);
  
  const [editUsername, setEditUsername] = useState(profile.username || "");
  const [editName, setEditName] = useState(profile.display_name || "");
  const [editSocial, setEditSocial] = useState(profile.social_url || "");
  
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
      navigate(`/profile/${cleanUsername}`, { replace: true });
    } catch (error) {
      console.error("Error updating username:", error);
      toast.error("Failed to update username");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!user) return;
    
    const cleanName = editName.trim();
    if (!cleanName) {
      toast.error("Name cannot be empty");
      return;
    }
    
    if (cleanName.length > 100) {
      toast.error("Name must be 100 characters or less");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: cleanName })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Name updated!");
      setIsEditingName(false);
      onProfileUpdate?.({ display_name: cleanName });
    } catch (error) {
      console.error("Error updating name:", error);
      toast.error("Failed to update name");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSocial = async () => {
    if (!user) return;
    
    let cleanUrl = editSocial.trim();
    
    // Auto-prefix with https if missing
    if (cleanUrl && !cleanUrl.startsWith("http")) {
      cleanUrl = `https://${cleanUrl}`;
    }
    
    // Validate URL format if not empty
    if (cleanUrl) {
      try {
        new URL(cleanUrl);
      } catch {
        toast.error("Please enter a valid URL");
        return;
      }
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ social_url: cleanUrl || null })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Social link updated!");
      setIsEditingSocial(false);
      onProfileUpdate?.({ social_url: cleanUrl || null });
    } catch (error) {
      console.error("Error updating social:", error);
      toast.error("Failed to update social link");
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
        {/* Avatar with upload */}
        <div className="relative">
          <ProfileAvatarUpload
            avatarUrl={profile.avatar_url}
            displayName={profile.display_name}
            isOwnProfile={isOwnProfile}
            userId={profile.user_id}
            onAvatarUpdate={(url) => onProfileUpdate?.({ avatar_url: url })}
          />
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
              {/* Editable Display Name */}
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-9 text-2xl font-display font-semibold w-64"
                    placeholder="Your name"
                    maxLength={100}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={handleSaveName}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 text-primary" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setIsEditingName(false);
                      setEditName(profile.display_name || "");
                    }}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-3xl font-display font-semibold text-foreground truncate">
                    {profile.display_name || "Anonymous"}
                  </h1>
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit name"
                    >
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}

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

              {/* Editable Social Link */}
              <div className="mt-2">
                {isEditingSocial ? (
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={editSocial}
                      onChange={(e) => setEditSocial(e.target.value)}
                      className="h-7 w-64 text-sm"
                      placeholder="twitter.com/username or any URL"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={handleSaveSocial}
                      disabled={isSaving}
                    >
                      <Save className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setIsEditingSocial(false);
                        setEditSocial(profile.social_url || "");
                      }}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ) : socialPlatform && profile.social_url ? (
                  <div className="flex items-center gap-1.5 group">
                    <a
                      href={profile.social_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 text-sm hover:underline ${socialPlatform.color}`}
                    >
                      <socialPlatform.icon className="h-4 w-4" />
                      <span className="truncate max-w-[200px]">
                        {getSocialHandle(profile.social_url)}
                      </span>
                    </a>
                    {isOwnProfile && (
                      <button
                        onClick={() => setIsEditingSocial(true)}
                        className="p-1 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit social link"
                      >
                        <Edit2 className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ) : isOwnProfile ? (
                  <button
                    onClick={() => setIsEditingSocial(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Link className="h-4 w-4" />
                    <span>Add social link</span>
                  </button>
                ) : null}
              </div>
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
