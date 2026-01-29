import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit2, Save, X, Wallet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfileData } from "@/pages/Profile";
import { ProfileAvatarUpload } from "./ProfileAvatarUpload";
import { ProfileSocialLinks } from "./ProfileSocialLinks";
import { LinkWalletDialog } from "./LinkWalletDialog";
import { useAccount } from "wagmi";
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
  
  const activeAddress = evmAddress;
  
  const { balance, isLoading: isLoadingBalance } = usePersonalBalance(activeAddress);
  
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [linkWalletOpen, setLinkWalletOpen] = useState(false);
  
  // Editing states
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editUsername, setEditUsername] = useState(profile.username || "");
  const [isSaving, setIsSaving] = useState(false);

  const joinDate = new Date(profile.created_at);
  const isGenesisMember = joinDate < new Date("2025-02-01");

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
    return "#";
  };

  const getChainIcon = () => {
    // No chain icon displayed for EVM addresses (minimalist approach)
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
            displayName={profile.username}
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

              {/* Social Links + Wallet on same level */}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {/* Social Links */}
                <ProfileSocialLinks userId={profile.user_id} isOwnProfile={isOwnProfile} />
                
                {/* Wallet Section - Chain icon links to explorer, clicking wallet opens top-up */}
                {activeAddress && (
                  <>
                    <div className="h-6 w-px bg-border" />
                    
                    <div className="flex items-center gap-2">
                      {/* Chain icon links to block explorer */}
                      <a
                        href={getExplorerUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-muted rounded-full transition-colors"
                        title="View on explorer"
                      >
                        {getChainIcon()}
                      </a>
                      
                      {/* Balance - clicking opens top-up for own profile */}
                      {isOwnProfile && evmAddress ? (
                        <PersonalTopUpDialog 
                          walletAddress={evmAddress}
                          trigger={
                            <button className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors">
                              <Wallet className="h-4 w-4" />
                              {isLoadingBalance ? "..." : `$${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </button>
                          }
                        />
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Wallet className="h-4 w-4" />
                          {isLoadingBalance ? "..." : `$${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                      )}
                      
                      {/* Link Wallet button for own profile */}
                      {isOwnProfile && (
                        <button
                          onClick={() => setLinkWalletOpen(true)}
                          className="inline-flex items-center justify-center h-7 px-2 rounded border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground text-xs gap-1"
                          title="Link another wallet"
                        >
                          <Plus className="h-3 w-3" />
                          Link
                        </button>
                      )}
                    </div>
                  </>
                )}
                
                {/* Link Wallet button when no wallet connected */}
                {!activeAddress && isOwnProfile && (
                  <>
                    <div className="h-6 w-px bg-border" />
                    <button
                      onClick={() => setLinkWalletOpen(true)}
                      className="inline-flex items-center justify-center h-7 px-2 rounded border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground text-xs gap-1"
                      title="Link wallet"
                    >
                      <Plus className="h-3 w-3" />
                      Link Wallet
                    </button>
                  </>
                )}
              </div>
              
              {/* Link Wallet Dialog */}
              <LinkWalletDialog open={linkWalletOpen} onOpenChange={setLinkWalletOpen} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
