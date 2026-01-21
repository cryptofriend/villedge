import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SceniusStatus = "idea" | "active" | "completed" | "paused";

export interface SceniusProject {
  id: string;
  village_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  project_url: string | null;
  github_url: string | null;
  tags: string[];
  contributors: string[];
  status: SceniusStatus;
  created_at: string;
  updated_at: string;
}

export interface SceniusInput {
  village_id: string;
  name: string;
  description?: string;
  image_url?: string;
  project_url?: string;
  github_url?: string;
  tags?: string[];
  contributors?: string[];
  status?: SceniusStatus;
}

export const useSceniusProjects = (villageId?: string) => {
  const [projects, setProjects] = useState<SceniusProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      let query = supabase
        .from("scenius")
        .select("*")
        .order("created_at", { ascending: false });

      if (villageId) {
        query = query.eq("village_id", villageId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Cast status to proper type
      const typedProjects = (data || []).map((p) => ({
        ...p,
        status: p.status as SceniusStatus,
      }));
      setProjects(typedProjects);
    } catch (err) {
      console.error("Error fetching scenius projects:", err);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [villageId]);

  const addProject = async (project: SceniusInput): Promise<SceniusProject | null> => {
    try {
      const { data, error } = await supabase
        .from("scenius")
        .insert({
          village_id: project.village_id,
          name: project.name,
          description: project.description || null,
          image_url: project.image_url || null,
          project_url: project.project_url || null,
          github_url: project.github_url || null,
          tags: project.tags || [],
          contributors: project.contributors || [],
          status: project.status || "active",
        })
        .select()
        .single();

      if (error) throw error;

      const typedData = { ...data, status: data.status as SceniusStatus };
      setProjects((prev) => [typedData, ...prev]);
      return typedData;
    } catch (err) {
      console.error("Error adding scenius project:", err);
      toast.error("Failed to add project");
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<SceniusInput>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("scenius")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
      return true;
    } catch (err) {
      console.error("Error updating scenius project:", err);
      toast.error("Failed to update project");
      return false;
    }
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("scenius").delete().eq("id", id);

      if (error) throw error;

      setProjects((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (err) {
      console.error("Error deleting scenius project:", err);
      toast.error("Failed to delete project");
      return false;
    }
  };

  return { projects, loading, addProject, updateProject, deleteProject, refetch: fetchProjects };
};
