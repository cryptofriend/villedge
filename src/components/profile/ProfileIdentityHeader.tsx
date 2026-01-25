import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, Edit2, Twitter, Github, Linkedin, Instagram, Globe, MapPin } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileData } from "@/pages/Profile";
import { format } from "date-fns";
import { useAccount } from "wagmi";
import { usePersonalBalance } from "@/hooks/usePersonalBalance";
import { PersonalTopUpDialog } from "@/components/PersonalTopUpDialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface VillageRegistration {
  id: string;
  village_id: string;
  village_name: string;
  start_date: string;
  logo_url: string | null;
}

interface ProfileIdentityHeaderProps {
  profile: ProfileData;
  isOwnProfile: boolean;
  userId?: string;
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

export const ProfileIdentityHeader = ({ profile, isOwnProfile, userId }: ProfileIdentityHeaderProps) => {
  const { address } = useAccount();
  const navigate = useNavigate();
  const { balance, isLoading: isLoadingBalance } = usePersonalBalance(address);
  const [copied, setCopied] = useState(false);
  const [walletExpanded, setWalletExpanded] = useState(false);
  const [villages, setVillages] = useState<VillageRegistration[]>([]);
  const [loadingVillages, setLoadingVillages] = useState(true);

  const socialPlatform = getSocialPlatform(profile.social_url || "");
  const joinDate = new Date(profile.created_at);
  const isGenesisMember = joinDate < new Date("2025-02-01"); // Example threshold

  // Fetch user's village registrations
  useEffect(() => {
    const fetchVillages = async () => {
      if (!userId) {
        setLoadingVillages(false);
        return;
      }

      try {
        // Get stays for this user
        const { data: stays } = await supabase
          .from("stays")
          .select("id, village_id, start_date")
          .eq("user_id", userId)
          .order("start_date", { ascending: true });

        if (!stays || stays.length === 0) {
          setVillages([]);
          setLoadingVillages(false);
          return;
        }

        // Get unique village IDs
        const villageIds = [...new Set(stays.map(s => s.village_id))];
        
        // Fetch village details
        const { data: villageData } = await supabase
          .from("villages")
          .select("id, name, logo_url")
          .in("id", villageIds);

        const villageMap = new Map(villageData?.map(v => [v.id, v]) || []);

        // Build village registrations (one per unique village, earliest date)
        const villageRegs: VillageRegistration[] = [];
        const seenVillages = new Set<string>();

        for (const stay of stays) {
          if (!seenVillages.has(stay.village_id)) {
            seenVillages.add(stay.village_id);
            const village = villageMap.get(stay.village_id);
            if (village) {
              villageRegs.push({
                id: stay.id,
                village_id: stay.village_id,
                village_name: village.name,
                start_date: stay.start_date,
                logo_url: village.logo_url,
              });
            }
          }
        }

        setVillages(villageRegs);
      } catch (error) {
        console.error("Error fetching villages:", error);
      } finally {
        setLoadingVillages(false);
      }
    };

    fetchVillages();
  }, [userId]);

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

          {/* Wallet & Villages Row */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Wallet Section */}
            {address && (
              <div className="p-3 bg-muted/30 rounded-lg border border-border">
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

            {/* Villages Timeline */}
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Villages</span>
              </div>
              
              {loadingVillages ? (
                <div className="text-xs text-muted-foreground">Loading...</div>
              ) : villages.length > 0 ? (
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {/* Timeline line */}
                  <div className="flex items-center gap-0">
                    {villages.map((village, index) => (
                      <div key={village.id} className="flex items-center">
                        {/* Village node */}
                        <button
                          onClick={() => navigate(`/${village.village_id}`)}
                          className="flex flex-col items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors group"
                          title={`${village.village_name} - Joined ${format(new Date(village.start_date), "MMM yyyy")}`}
                        >
                          {village.logo_url ? (
                            <img 
                              src={village.logo_url} 
                              alt={village.village_name}
                              className="w-8 h-8 rounded-full object-cover ring-2 ring-background group-hover:ring-primary/50 transition-all"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-background group-hover:ring-primary/50 transition-all">
                              <span className="text-xs font-medium text-primary">
                                {village.village_name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-[10px] text-muted-foreground group-hover:text-foreground whitespace-nowrap max-w-[60px] truncate">
                            {village.village_name}
                          </span>
                        </button>
                        
                        {/* Connector line */}
                        {index < villages.length - 1 && (
                          <div className="w-4 h-0.5 bg-border" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">
                  No villages joined yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
