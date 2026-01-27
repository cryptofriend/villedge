import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, EyeOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, Profile as ProfileType } from "@/hooks/useAuth";
import { ProfileIdentityHeader } from "@/components/profile/ProfileIdentityHeader";
import { ProfileActivityHistory } from "@/components/profile/ProfileActivityHistory";
import { ProfileConnectedNetwork } from "@/components/profile/ProfileConnectedNetwork";
import { ProfileVillageTimeline } from "@/components/profile/ProfileVillageTimeline";
import { ProfileSceniusSection } from "@/components/profile/ProfileSceniusSection";
import { ProfileEventsCalendar } from "@/components/profile/ProfileEventsCalendar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ProfileData extends ProfileType {
  title?: string | null;
  is_anon?: boolean;
}

export interface UserActivity {
  id: string;
  type: "village_join" | "village_create" | "stay_register" | "spot_add" | "event_create" | "bulletin_post";
  title: string;
  village_name?: string;
  date: string;
}

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activities, setActivities] = useState<UserActivity[]>([]);

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

        setProfileData(profile);

        // Fetch user activity history
        const activityHistory: UserActivity[] = [];

        // Fetch villages user created
        const { data: createdVillages } = await supabase
          .from("villages")
          .select("id, name, created_at")
          .eq("created_by", userId);

        if (createdVillages) {
          createdVillages.forEach(v => {
            activityHistory.push({
              id: `village-create-${v.id}`,
              type: "village_create",
              title: `Created village "${v.name}"`,
              village_name: v.name,
              date: v.created_at,
            });
          });
        }

        // Fetch stays (registrations)
        const { data: stays } = await supabase
          .from("stays")
          .select("id, village_id, start_date, created_at")
          .eq("user_id", userId);

        if (stays && stays.length > 0) {
          const villageIds = [...new Set(stays.map(s => s.village_id))];
          const { data: villages } = await supabase
            .from("villages")
            .select("id, name")
            .in("id", villageIds);
          const villageMap = new Map(villages?.map(v => [v.id, v.name]) || []);

          stays.forEach(s => {
            activityHistory.push({
              id: `stay-${s.id}`,
              type: "stay_register",
              title: `Registered for stay`,
              village_name: villageMap.get(s.village_id) || s.village_id,
              date: s.created_at,
            });
          });
        }

        // Fetch bulletin posts by display_name
        if (profile.display_name) {
          const { data: bulletinPosts } = await supabase
            .from("bulletin")
            .select("id, village_id, created_at, message")
            .eq("author_name", profile.display_name)
            .order("created_at", { ascending: false })
            .limit(20);

          if (bulletinPosts && bulletinPosts.length > 0) {
            const villageIds = [...new Set(bulletinPosts.map(b => b.village_id))];
            const { data: villages } = await supabase
              .from("villages")
              .select("id, name")
              .in("id", villageIds);
            const villageMap = new Map(villages?.map(v => [v.id, v.name]) || []);

            bulletinPosts.forEach(b => {
              activityHistory.push({
                id: `bulletin-${b.id}`,
                type: "bulletin_post",
                title: `Posted in bulletin: "${b.message.slice(0, 40)}${b.message.length > 40 ? '...' : ''}"`,
                village_name: villageMap.get(b.village_id) || b.village_id,
                date: b.created_at,
              });
            });
          }
        }

        // Sort by date descending
        activityHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setActivities(activityHistory);

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

  const handleToggleAnon = async () => {
    if (!isOwnProfile || !user) return;
    
    const newValue = !profileData.is_anon;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_anon: newValue })
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      setProfileData(prev => prev ? { ...prev, is_anon: newValue } : null);
      toast.success(newValue ? "Anon mode enabled" : "Anon mode disabled");
    } catch (error) {
      console.error("Error toggling anon mode:", error);
      toast.error("Failed to update anon mode");
    }
  };

  // Determine if content should be blurred (anon mode ON and viewer is not the profile owner)
  const shouldBlur = profileData.is_anon && !isOwnProfile;

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

      {/* Anon Mode Toggle - top right */}
      {isOwnProfile && (
        <div className="fixed top-4 right-4 z-50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleAnon}
                className={cn(
                  "bg-background/80 backdrop-blur-sm gap-2",
                  profileData.is_anon && "border-primary text-primary"
                )}
              >
                {profileData.is_anon ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {profileData.is_anon ? "Anon" : "Public"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[200px] text-xs">
                {profileData.is_anon 
                  ? "Anon mode is ON. Your village participation, projects, and activity are hidden from others."
                  : "Click to enable Anon mode and hide your public info from other users."}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 pt-16 space-y-0">
        {/* 1. Identity Header with editable name, username, avatar, social link */}
        <ProfileIdentityHeader 
          profile={profileData} 
          isOwnProfile={isOwnProfile}
          onProfileUpdate={(updates) => setProfileData(prev => prev ? { ...prev, ...updates } : null)}
        />

        {/* 2. Working On / Scenius Section */}
        <div className={cn(shouldBlur && "blur-md select-none pointer-events-none")}>
          <ProfileSceniusSection
            projectDescription={profileData.project_description}
            projectUrl={profileData.project_url}
            isOwnProfile={isOwnProfile}
            userId={profileData.user_id}
            onUpdate={(updates) => setProfileData(prev => prev ? { ...prev, ...updates } : null)}
          />
        </div>

        {/* 3. Village Timeline / Participation */}
        <div className={cn(shouldBlur && "blur-md select-none pointer-events-none")}>
          <ProfileVillageTimeline userId={profileUserId || undefined} />
        </div>

        {/* 5. Events Calendar */}
        {profileUserId && (
          <div className={cn(shouldBlur && "blur-md select-none pointer-events-none")}>
            <ProfileEventsCalendar userId={profileUserId} />
          </div>
        )}

        {/* 6. Activity History */}
        <div className={cn(shouldBlur && "blur-md select-none pointer-events-none")}>
          <ProfileActivityHistory activities={activities} />
        </div>

        {/* 7. Connected Network */}
        <ProfileConnectedNetwork userId={profileUserId || ""} />
      </div>
    </div>
  );
};

export default Profile;
