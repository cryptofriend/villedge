import { useState } from "react";
import { Copy, Check, ExternalLink, Edit2, Twitter, Github, Linkedin, Instagram, Globe } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileData } from "@/pages/Profile";
import { format } from "date-fns";
import { useAccount } from "wagmi";
import { usePersonalBalance } from "@/hooks/usePersonalBalance";
import { PersonalTopUpDialog } from "@/components/PersonalTopUpDialog";

interface ProfileIdentityHeaderProps {
  profile: ProfileData;
  isOwnProfile: boolean;
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

export const ProfileIdentityHeader = ({ profile, isOwnProfile }: ProfileIdentityHeaderProps) => {
  const { address } = useAccount();
  const { balance, isLoading: isLoadingBalance } = usePersonalBalance(address);
  const [copied, setCopied] = useState(false);
  const [walletExpanded, setWalletExpanded] = useState(false);

  const socialPlatform = getSocialPlatform(profile.social_url || "");
  const joinDate = new Date(profile.created_at);
  const isGenesisMember = joinDate < new Date("2025-02-01");

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

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

              {/* Title / Role */}
              {profile.project_description && (
                <p className="text-base text-muted-foreground mt-0.5 truncate">
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

            {/* Edit Button */}
            {isOwnProfile && (
              <Button variant="outline" size="sm" className="shrink-0">
                <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )}
          </div>

          {/* Join Date */}
          <div className="flex items-center gap-3 mt-4 text-sm text-muted-foreground">
            <span>Member since {format(joinDate, "MMM yyyy")}</span>
          </div>

          {/* Wallet Section */}
          {address && (
            <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setWalletExpanded(!walletExpanded)}
                  className="flex items-center gap-2 text-sm font-mono text-foreground hover:text-primary transition-colors"
                >
                  {walletExpanded ? address : truncatedAddress}
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
                    href={`https://basescan.org/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-muted rounded transition-colors"
                    title="View on Basescan"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </div>
              </div>

              {/* Balance & Chain */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  {isLoadingBalance ? (
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  ) : (
                    <span className="text-sm font-medium text-foreground">
                      ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                  {isOwnProfile && <PersonalTopUpDialog walletAddress={address} />}
                </div>
                <Badge variant="secondary" className="bg-blue-600/10 text-blue-600 border-blue-600/20 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1" />
                  Base
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
