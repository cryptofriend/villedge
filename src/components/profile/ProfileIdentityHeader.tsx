import { useState, useEffect, useMemo } from "react";
import { Copy, Check, ExternalLink, Edit2, Twitter, Github, Linkedin, Instagram, Globe, MapPin } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileData } from "@/pages/Profile";
import { format, differenceInDays, startOfMonth, endOfMonth, addMonths, isWithinInterval, isBefore, isAfter } from "date-fns";
import { useAccount } from "wagmi";
import { usePersonalBalance } from "@/hooks/usePersonalBalance";
import { PersonalTopUpDialog } from "@/components/PersonalTopUpDialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface VillageStay {
  id: string;
  village_id: string;
  village_name: string;
  start_date: string;
  end_date: string;
  logo_url: string | null;
  status: string | null;
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
  const [villages, setVillages] = useState<VillageStay[]>([]);
  const [loadingVillages, setLoadingVillages] = useState(true);

  const today = new Date();

  // Calculate timeline range based on stays
  const timelineData = useMemo(() => {
    if (villages.length === 0) {
      // Default: show 6 months centered on today
      const start = startOfMonth(addMonths(today, -1));
      const end = endOfMonth(addMonths(today, 4));
      return { start, end, months: generateMonths(start, end) };
    }

    // Find the earliest start and latest end
    const allDates = villages.flatMap(v => [new Date(v.start_date), new Date(v.end_date)]);
    allDates.push(today);
    
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    const start = startOfMonth(addMonths(minDate, -1));
    const end = endOfMonth(addMonths(maxDate, 1));
    
    return { start, end, months: generateMonths(start, end) };
  }, [villages, today]);

  function generateMonths(start: Date, end: Date) {
    const months: Date[] = [];
    let current = startOfMonth(start);
    while (isBefore(current, end) || current.getTime() === end.getTime()) {
      months.push(current);
      current = addMonths(current, 1);
    }
    return months;
  }

  const socialPlatform = getSocialPlatform(profile.social_url || "");
  const joinDate = new Date(profile.created_at);
  const isGenesisMember = joinDate < new Date("2025-02-01");

  // Fetch user's village stays (all statuses)
  useEffect(() => {
    const fetchVillages = async () => {
      if (!userId) {
        setLoadingVillages(false);
        return;
      }

      try {
        // Get all stays for this user (all statuses)
        const { data: stays } = await supabase
          .from("stays")
          .select("id, village_id, start_date, end_date, status")
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

        // Build village stays
        const villageStays: VillageStay[] = stays.map(stay => {
          const village = villageMap.get(stay.village_id);
          return {
            id: stay.id,
            village_id: stay.village_id,
            village_name: village?.name || stay.village_id,
            start_date: stay.start_date,
            end_date: stay.end_date,
            logo_url: village?.logo_url || null,
            status: stay.status,
          };
        });

        setVillages(villageStays);
      } catch (error) {
        console.error("Error fetching villages:", error);
      } finally {
        setLoadingVillages(false);
      }
    };

    fetchVillages();
  }, [userId]);

  // Calculate bar position and width
  const getBarStyle = (stay: VillageStay) => {
    const totalDays = differenceInDays(timelineData.end, timelineData.start);
    const startDate = new Date(stay.start_date);
    const endDate = new Date(stay.end_date);
    
    const startOffset = Math.max(0, differenceInDays(startDate, timelineData.start));
    const endOffset = Math.min(totalDays, differenceInDays(endDate, timelineData.start));
    
    const left = (startOffset / totalDays) * 100;
    const width = ((endOffset - startOffset) / totalDays) * 100;
    
    return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
  };

  // Calculate today marker position
  const getTodayPosition = () => {
    const totalDays = differenceInDays(timelineData.end, timelineData.start);
    const todayOffset = differenceInDays(today, timelineData.start);
    return `${(todayOffset / totalDays) * 100}%`;
  };

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

          {/* Wallet & Villages Stack */}
          <div className="mt-4 space-y-3">
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

            {/* Villages Timeline (Gantt-style) */}
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Village Participation</span>
              </div>
              
              {loadingVillages ? (
                <div className="text-xs text-muted-foreground">Loading...</div>
              ) : villages.length > 0 ? (
                <div className="relative">
                  {/* Month headers */}
                  <div className="flex border-b border-border pb-1 mb-2">
                    {timelineData.months.map((month, idx) => (
                      <div 
                        key={idx} 
                        className="flex-1 text-[10px] text-muted-foreground font-medium text-center"
                      >
                        {format(month, "MMM")}
                      </div>
                    ))}
                  </div>

                  {/* Today marker */}
                  <div 
                    className="absolute top-0 bottom-0 w-px bg-primary z-10"
                    style={{ left: getTodayPosition() }}
                  >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      Today
                    </div>
                  </div>

                  {/* Village bars */}
                  <div className="space-y-2 pt-2">
                    {villages.map((stay) => {
                      const barStyle = getBarStyle(stay);
                      const isPlanning = stay.status === "planning";
                      
                      return (
                        <div key={stay.id} className="relative h-8">
                          <button
                            onClick={() => navigate(`/${stay.village_id}`)}
                            className={`absolute h-full flex items-center gap-2 px-2 rounded-full transition-all hover:ring-2 hover:ring-primary/50 ${
                              isPlanning 
                                ? "bg-muted/80 border border-dashed border-muted-foreground/30" 
                                : "bg-primary/15 border border-primary/30"
                            }`}
                            style={barStyle}
                            title={`${stay.village_name}: ${format(new Date(stay.start_date), "MMM d")} - ${format(new Date(stay.end_date), "MMM d, yyyy")}${isPlanning ? " (Planning)" : ""}`}
                          >
                            {stay.logo_url ? (
                              <img 
                                src={stay.logo_url} 
                                alt={stay.village_name}
                                className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-[8px] font-medium text-primary">
                                  {stay.village_name.slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className={`text-xs font-medium truncate ${isPlanning ? "text-muted-foreground" : "text-foreground"}`}>
                              {stay.village_name}
                            </span>
                            {isPlanning && (
                              <span className="text-[9px] text-muted-foreground">?</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic py-2">
                  No village participation yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
