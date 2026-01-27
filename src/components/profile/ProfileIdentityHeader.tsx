import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit2, Save, X, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfileData } from "@/pages/Profile";
import { ProfileAvatarUpload } from "./ProfileAvatarUpload";
import { ProfileSocialLinks } from "./ProfileSocialLinks";
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
  
  const [topUpOpen, setTopUpOpen] = useState(false);
  
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
    if (tonAddress) {
      return `https://tonscan.org/address/${tonAddress}`;
    }
    return "#";
  };

  const getChainIcon = () => {
    if (evmAddress) {
      return (
        <svg className="w-4 h-4" viewBox="0 0 111 111" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M54.9214 111C85.2297 111 109.843 86.3862 109.843 56.0778C109.843 25.7695 85.2297 1.15576 54.9214 1.15576C24.613 1.15576 0 25.7695 0 56.0778C0 86.3862 24.613 111 54.9214 111Z" fill="#0052FF"/>
          <path d="M55.4201 73.3121C45.8193 73.3121 37.9859 65.4788 37.9859 55.878C37.9859 46.2772 45.8193 38.4438 55.4201 38.4438C64.1485 38.4438 71.4158 44.9388 72.6581 53.378H90.1911C88.8496 35.2452 73.7192 21.0096 55.4201 21.0096C36.2151 21.0096 20.5518 36.673 20.5518 55.878C20.5518 75.083 36.2151 90.7464 55.4201 90.7464C73.7192 90.7464 88.8496 76.5108 90.1911 58.378H72.6581C71.4158 66.8172 64.1485 73.3121 55.4201 73.3121Z" fill="white"/>
        </svg>
      );
    }
    if (tonAddress) {
      return (
        <svg className="w-4 h-4" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M28 56C43.464 56 56 43.464 56 28C56 12.536 43.464 0 28 0C12.536 0 0 12.536 0 28C0 43.464 12.536 56 28 56Z" fill="#0098EA"/>
          <path d="M37.5603 15.6277H18.4386C14.9228 15.6277 12.6944 19.4202 14.4632 22.4861L26.2644 42.9409C27.0345 44.2765 28.9644 44.2765 29.7345 42.9409L41.5765 22.4861C43.3045 19.4202 41.0761 15.6277 37.5765 15.6277H37.5603ZM26.2491 36.8068L23.6027 31.883L17.4801 21.0252C17.0629 20.312 17.5765 19.3927 18.4386 19.3927H26.2491V36.8068ZM38.5765 21.0089L32.454 31.8667L29.8076 36.7905V19.3764H37.6181C38.4803 19.3764 38.9938 20.2957 38.5765 21.0089Z" fill="white"/>
        </svg>
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
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
