import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, Profile as ProfileType } from "@/hooks/useAuth";
import { ProfileIdentityHeader } from "@/components/profile/ProfileIdentityHeader";
import { ProfileReputationStrip } from "@/components/profile/ProfileReputationStrip";
import { ProfileMission } from "@/components/profile/ProfileMission";
import { ProfileQuests } from "@/components/profile/ProfileQuests";
import { ProfileCapabilities } from "@/components/profile/ProfileCapabilities";
import { ProfileOpenNeeds } from "@/components/profile/ProfileOpenNeeds";
import { ProfileContributionHistory } from "@/components/profile/ProfileContributionHistory";
import { ProfileConnectedNetwork } from "@/components/profile/ProfileConnectedNetwork";
import { ProfileVillageTimeline } from "@/components/profile/ProfileVillageTimeline";
import { ProfileLinkedWallets } from "@/components/profile/ProfileLinkedWallets";

export interface ProfileData extends ProfileType {
  // Extended fields for the full profile page
  title?: string | null;
  mission?: string | null;
  capabilities?: string[] | null;
  reputation_score?: number;
  contribution_count?: number;
  voting_power?: number;
  trust_level?: number;
}

export interface Quest {
  id: string;
  title: string;
  status: "open" | "in_progress" | "completed";
  tag?: string;
}

export interface OpenNeed {
  id: string;
  description: string;
  reward?: string;
  status: "open" | "closed";
}

export interface Contribution {
  id: string;
  type: "village_join" | "contribution" | "event" | "proposal";
  title: string;
  village_name?: string;
  date: string;
  passed?: boolean;
}

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile } = useAuth();
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Mock data for MVP - these would come from the database in production
  const [quests, setQuests] = useState<Quest[]>([
    { id: "1", title: "Design governance framework", status: "in_progress", tag: "Community" },
    { id: "2", title: "Build contributor dashboard", status: "open", tag: "UX" },
    { id: "3", title: "Host weekly standup", status: "completed", tag: "Community" },
  ]);

  const [openNeeds, setOpenNeeds] = useState<OpenNeed[]>([
    { id: "1", description: "Looking for a Solidity developer to review treasury contracts", reward: "Reputation + Co-authorship", status: "open" },
    { id: "2", description: "Need help with video editing for community updates", status: "open" },
  ]);

  const [contributions, setContributions] = useState<Contribution[]>([]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!username) {
        setLoading(false);
        return;
      }

      try {
        // First try to fetch by username
        let { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .single();

        // If not found by username, try by user_id (for backward compatibility)
        if (error || !profile) {
          const { data: profileById, error: errorById } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", username)
            .single();
          
          if (errorById || !profileById) {
            setLoading(false);
            return;
          }
          profile = profileById;
        }

        const userId = profile.user_id;
        setProfileUserId(userId);

        // Check if this is the current user's profile
        const isOwn = user?.id === userId;
        setIsOwnProfile(isOwn);

        // Extend with mock reputation data for MVP
        const extendedProfile: ProfileData = {
          ...profile,
          reputation_score: 847,
          contribution_count: 23,
          voting_power: 156,
          trust_level: 3,
          mission: profile.bio || null, // Use bio as mission for now
          capabilities: profile.offerings ? profile.offerings.split(",").map(s => s.trim()) : [],
        };

        setProfileData(extendedProfile);

        // Fetch contribution history (villages joined via stays)
        const { data: stays } = await supabase
          .from("stays")
          .select("id, village_id, start_date, nickname")
          .eq("user_id", userId)
          .order("start_date", { ascending: false });

        // Fetch villages user created
        const { data: createdVillages } = await supabase
          .from("villages")
          .select("id, name, created_at")
          .eq("created_by", userId);

        // Build contribution history
        const contributionHistory: Contribution[] = [];

        if (createdVillages) {
          createdVillages.forEach(v => {
            contributionHistory.push({
              id: `village-${v.id}`,
              type: "village_join",
              title: `Created ${v.name}`,
              village_name: v.name,
              date: v.created_at,
            });
          });
        }

        if (stays) {
          // Get village names
          const villageIds = [...new Set(stays.map(s => s.village_id))];
          const { data: villages } = await supabase
            .from("villages")
            .select("id, name")
            .in("id", villageIds);

          const villageMap = new Map(villages?.map(v => [v.id, v.name]) || []);

          stays.forEach(s => {
            contributionHistory.push({
              id: `stay-${s.id}`,
              type: "village_join",
              title: `Joined as resident`,
              village_name: villageMap.get(s.village_id) || s.village_id,
              date: s.start_date,
            });
          });
        }

        // Sort by date descending
        contributionHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setContributions(contributionHistory);

      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [username, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Profile not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="bg-background/80 backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 pt-16 space-y-0">
        {/* 1. Identity Header */}
        <ProfileIdentityHeader 
          profile={profileData} 
          isOwnProfile={isOwnProfile}
        />

        {/* 2. Village Timeline */}
        <ProfileVillageTimeline userId={profileUserId || undefined} />

        {/* 3. Reputation Strip (Sticky) */}
        <ProfileReputationStrip 
          reputationScore={profileData.reputation_score || 0}
          contributionCount={profileData.contribution_count || 0}
          votingPower={profileData.voting_power || 0}
          trustLevel={profileData.trust_level || 1}
        />

        {/* 3. Current Mission */}
        <ProfileMission 
          mission={profileData.mission}
          isOwnProfile={isOwnProfile}
          onUpdate={(mission) => setProfileData(prev => prev ? { ...prev, mission } : null)}
        />

        {/* 4. Active Quests */}
        <ProfileQuests 
          quests={quests}
          isOwnProfile={isOwnProfile}
          onUpdate={setQuests}
        />

        {/* 5. Linked Wallets */}
        <ProfileLinkedWallets
          userId={profileUserId || undefined}
          isOwnProfile={isOwnProfile}
        />

        {/* 6. Capabilities */}
        <ProfileCapabilities 
          capabilities={profileData.capabilities || []}
          isOwnProfile={isOwnProfile}
          onUpdate={(capabilities) => setProfileData(prev => prev ? { ...prev, capabilities } : null)}
        />

        {/* 6. Open Needs */}
        <ProfileOpenNeeds 
          needs={openNeeds}
          isOwnProfile={isOwnProfile}
          onUpdate={setOpenNeeds}
        />

        {/* 7. Contribution History */}
        <ProfileContributionHistory contributions={contributions} />

        {/* 8. Connected Network */}
        <ProfileConnectedNetwork userId={profileUserId || ""} />
      </div>
    </div>
  );
};

export default Profile;
