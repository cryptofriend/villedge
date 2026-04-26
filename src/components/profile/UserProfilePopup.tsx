import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Twitter, Instagram, Github, Linkedin, Loader2, BadgeCheck, ArrowRight, Home } from "lucide-react";
import { getBestAvatar } from "@/lib/avatar";

type PublicProfile = {
  user_id: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  social_url: string | null;
  project_url: string | null;
  project_description: string | null;
  offerings: string | null;
  asks: string | null;
  is_verified: boolean | null;
};

interface UserProfilePopupContextValue {
  /** Open the popup for a given username (preferred) or user_id. */
  open: (key: string | null | undefined) => void;
}

const UserProfilePopupContext = createContext<UserProfilePopupContextValue | null>(null);

export const useUserProfilePopup = () => {
  const ctx = useContext(UserProfilePopupContext);
  if (!ctx) {
    // Safe fallback: no-op if provider is missing (e.g. during isolated tests)
    return { open: () => {} };
  }
  return ctx;
};

const getSocialIcon = (url: string) => {
  const u = url.toLowerCase();
  if (u.includes("twitter.com") || u.includes("x.com")) return <Twitter className="h-4 w-4" />;
  if (u.includes("instagram.com")) return <Instagram className="h-4 w-4" />;
  if (u.includes("github.com")) return <Github className="h-4 w-4" />;
  if (u.includes("linkedin.com")) return <Linkedin className="h-4 w-4" />;
  return <ExternalLink className="h-4 w-4" />;
};

type JoinedStay = {
  id: string;
  name: string;
  village_id: string | null;
  image_url: string | null;
};

export const UserProfilePopupProvider = ({ children }: { children: ReactNode }) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [joinedStays, setJoinedStays] = useState<JoinedStay[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const open = useCallback((key: string | null | undefined) => {
    if (!key) return;
    setActiveKey(key);
  }, []);

  const close = useCallback(() => {
    setActiveKey(null);
    setProfile(null);
    setJoinedStays([]);
  }, []);

  useEffect(() => {
    if (!activeKey) return;
    let cancelled = false;
    setLoading(true);
    setProfile(null);
    setJoinedStays([]);

    const fetchProfile = async () => {
      // Try by username first
      let { data } = await supabase
        .from("profiles_public")
        .select("user_id, username, avatar_url, bio, social_url, project_url, project_description, offerings, asks, is_verified")
        .eq("username", activeKey)
        .maybeSingle();

      // Fall back to user_id
      if (!data) {
        const res = await supabase
          .from("profiles_public")
          .select("user_id, username, avatar_url, bio, social_url, project_url, project_description, offerings, asks, is_verified")
          .eq("user_id", activeKey)
          .maybeSingle();
        data = res.data ?? null;
      }

      if (cancelled) return;
      setProfile(data ?? null);

      // Fetch joined stays (accommodation spots the user joined)
      if (data?.user_id) {
        const { data: joins } = await supabase
          .from("spot_joins")
          .select("spot_id")
          .eq("user_id", data.user_id);
        const spotIds = (joins || []).map((j: any) => j.spot_id);
        if (spotIds.length > 0) {
          const { data: spots } = await supabase
            .from("spots")
            .select("id, name, village_id, image_url, category")
            .in("id", spotIds)
            .eq("category", "accommodation");
          if (!cancelled && spots) {
            setJoinedStays(
              spots.map((s: any) => ({
                id: s.id,
                name: s.name,
                village_id: s.village_id,
                image_url: s.image_url,
              }))
            );
          }
        }
      }

      if (!cancelled) setLoading(false);
    };

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [activeKey]);

  const value = useMemo(() => ({ open }), [open]);
  const isOpen = !!activeKey;

  const displayName = profile?.username || (typeof activeKey === "string" ? activeKey : "User");
  const avatarUrl = profile
    ? getBestAvatar(displayName, profile.social_url, 96)
    : getBestAvatar(displayName, null, 96);

  const goToFullProfile = () => {
    const slug = profile?.username || profile?.user_id || activeKey;
    if (!slug) return;
    close();
    navigate(`/profile/${slug}`);
  };

  return (
    <UserProfilePopupContext.Provider value={value}>
      {children}
      <Dialog open={isOpen} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">{displayName}'s profile</DialogTitle>
            <DialogDescription className="sr-only">Public profile card</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading profile…
            </div>
          ) : !profile ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <Avatar className="w-16 h-16">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground">No public profile found.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="w-20 h-20 ring-2 ring-primary/10">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="text-xl">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-1.5">
                  {displayName}
                  {profile.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                </h2>
                {profile.bio && (
                  <p className="text-sm text-muted-foreground max-w-sm">{profile.bio}</p>
                )}
              </div>

              {(profile.offerings || profile.asks || profile.project_description) && (
                <div className="w-full space-y-2 text-left bg-muted/30 rounded-lg p-4 text-sm">
                  {profile.project_description && (
                    <div>
                      <span className="font-medium">Project: </span>
                      <span className="text-muted-foreground">{profile.project_description}</span>
                    </div>
                  )}
                  {profile.offerings && (
                    <div>
                      <span className="font-medium">Offers: </span>
                      <span className="text-muted-foreground">{profile.offerings}</span>
                    </div>
                  )}
                  {profile.asks && (
                    <div>
                      <span className="font-medium">Asks: </span>
                      <span className="text-muted-foreground">{profile.asks}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 justify-center">
                {profile.social_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={profile.social_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                      {getSocialIcon(profile.social_url)}
                      Social
                    </a>
                  </Button>
                )}
                {profile.project_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={profile.project_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Project
                    </a>
                  </Button>
                )}
                <Button size="sm" onClick={goToFullProfile} className="gap-1.5">
                  Full profile
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </UserProfilePopupContext.Provider>
  );
};
