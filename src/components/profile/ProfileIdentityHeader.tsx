import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, ExternalLink, Edit2, Save, X, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfileData } from "@/pages/Profile";
import { ProfileAvatarUpload } from "./ProfileAvatarUpload";
import { ProfileSocialLinks } from "./ProfileSocialLinks";
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
  const [editUsername, setEditUsername] = useState(profile.username || "");
  const [isSaving, setIsSaving] = useState(false);

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
              {/* Editable Username as primary identifier */}
              {isEditingUsername ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl text-muted-foreground">@</span>
                  <Input
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="h-10 w-48 text-2xl font-display font-semibold"
                    placeholder="username"
                    maxLength={30}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={handleSaveUsername}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 text-primary" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setIsEditingUsername(false);
                      setEditUsername(profile.username || "");
                    }}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-3xl font-display font-semibold text-foreground truncate">
                    @{profile.username || "anonymous"}
                  </h1>
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditingUsername(true)}
                      className="p-1 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit username"
                    >
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}

              {/* Join Date */}
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>Member since {format(joinDate, "MMM yyyy")}</span>
              </div>

              {/* Social Links + Wallet on same level */}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                {/* Social Links */}
                <ProfileSocialLinks userId={profile.user_id} isOwnProfile={isOwnProfile} />
                
                {/* Divider if both social and wallet exist */}
                {activeAddress && (
                  <div className="h-6 w-px bg-border" />
                )}
                
                {/* Wallet Section */}
                {activeAddress && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWalletExpanded(!walletExpanded)}
                      className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Wallet className="h-4 w-4" />
                      {walletExpanded ? activeAddress : truncatedAddress}
                    </button>
                    <button
                      onClick={copyAddress}
                      className="p-1 hover:bg-muted rounded transition-colors"
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
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="View on explorer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                    {getChainBadge()}
                    
                    {/* Balance */}
                    <span className="text-sm font-medium text-foreground ml-1">
                      {isLoadingBalance ? "..." : `$${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                    
                    {isOwnProfile && evmAddress && <PersonalTopUpDialog walletAddress={evmAddress} />}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
