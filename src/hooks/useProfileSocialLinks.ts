import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SocialLink {
  id: string;
  user_id: string;
  url: string;
  platform: string | null;
  created_at: string;
}

// Detect social platform from URL
export const getSocialPlatform = (url: string) => {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) {
    return "twitter";
  }
  if (lowerUrl.includes("github.com")) {
    return "github";
  }
  if (lowerUrl.includes("linkedin.com")) {
    return "linkedin";
  }
  if (lowerUrl.includes("instagram.com")) {
    return "instagram";
  }
  if (lowerUrl.includes("telegram.me") || lowerUrl.includes("t.me")) {
    return "telegram";
  }
  if (lowerUrl.includes("spotify.com") || lowerUrl.includes("open.spotify.com")) {
    return "spotify";
  }
  if (url.startsWith("http")) {
    return "website";
  }
  return null;
};

export const useProfileSocialLinks = (userId: string | null) => {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profile_social_links")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setSocialLinks(data || []);
    } catch (error) {
      console.error("Error fetching social links:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const addLink = async (url: string) => {
    if (!userId) return { error: "No user ID" };

    const platform = getSocialPlatform(url);
    
    const { data, error } = await supabase
      .from("profile_social_links")
      .insert({ user_id: userId, url, platform })
      .select()
      .single();

    if (!error && data) {
      setSocialLinks((prev) => [...prev, data]);
    }
    return { data, error };
  };

  const updateLink = async (id: string, url: string) => {
    const platform = getSocialPlatform(url);
    
    const { error } = await supabase
      .from("profile_social_links")
      .update({ url, platform })
      .eq("id", id);

    if (!error) {
      setSocialLinks((prev) =>
        prev.map((link) => (link.id === id ? { ...link, url, platform } : link))
      );
    }
    return { error };
  };

  const deleteLink = async (id: string) => {
    const { error } = await supabase
      .from("profile_social_links")
      .delete()
      .eq("id", id);

    if (!error) {
      setSocialLinks((prev) => prev.filter((link) => link.id !== id));
    }
    return { error };
  };

  return {
    socialLinks,
    isLoading,
    addLink,
    updateLink,
    deleteLink,
    refetch: fetchLinks,
  };
};
