import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserProject {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  description: string | null;
  favicon_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useUserProjects = (userId: string | null) => {
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching user projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const addProject = async (url: string) => {
    if (!userId) return { error: "No user ID" };

    try {
      // First scrape the metadata
      const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke(
        'scrape-project-metadata',
        { body: { url } }
      );

      if (scrapeError) {
        console.error("Scrape error:", scrapeError);
      }

      const metadata = scrapeData?.data || {};

      // Insert the project with metadata
      const { data, error } = await supabase
        .from("user_projects")
        .insert({
          user_id: userId,
          url,
          title: metadata.title || null,
          description: metadata.description || null,
          favicon_url: metadata.favicon_url || null,
          thumbnail_url: metadata.thumbnail_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setProjects((prev) => [data, ...prev]);
      }
      return { data, error: null };
    } catch (error) {
      console.error("Error adding project:", error);
      return { data: null, error };
    }
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase
      .from("user_projects")
      .delete()
      .eq("id", id);

    if (!error) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
    return { error };
  };

  return {
    projects,
    isLoading,
    addProject,
    deleteProject,
    refetch: fetchProjects,
  };
};
