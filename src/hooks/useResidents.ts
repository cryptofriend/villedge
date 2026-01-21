import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Resident {
  id: string;
  village_id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  twitter_url: string | null;
  github_url: string | null;
  website_url: string | null;
  skills: string[];
  interests: string[];
  looking_for: string | null;
  offering: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResidentInput {
  village_id: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  twitter_url?: string;
  github_url?: string;
  website_url?: string;
  skills?: string[];
  interests?: string[];
  looking_for?: string;
  offering?: string;
}

export const useResidents = (villageId?: string) => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResidents = async () => {
    try {
      let query = supabase
        .from("residents")
        .select("*")
        .order("name", { ascending: true });

      if (villageId) {
        query = query.eq("village_id", villageId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setResidents(data || []);
    } catch (err) {
      console.error("Error fetching residents:", err);
      toast.error("Failed to load residents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, [villageId]);

  const addResident = async (resident: ResidentInput): Promise<Resident | null> => {
    try {
      const { data, error } = await supabase
        .from("residents")
        .insert({
          village_id: resident.village_id,
          name: resident.name,
          avatar_url: resident.avatar_url || null,
          bio: resident.bio || null,
          twitter_url: resident.twitter_url || null,
          github_url: resident.github_url || null,
          website_url: resident.website_url || null,
          skills: resident.skills || [],
          interests: resident.interests || [],
          looking_for: resident.looking_for || null,
          offering: resident.offering || null,
        })
        .select()
        .single();

      if (error) throw error;

      setResidents((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (err) {
      console.error("Error adding resident:", err);
      toast.error("Failed to add resident");
      return null;
    }
  };

  const updateResident = async (id: string, updates: Partial<ResidentInput>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("residents")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setResidents((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
      return true;
    } catch (err) {
      console.error("Error updating resident:", err);
      toast.error("Failed to update resident");
      return false;
    }
  };

  const deleteResident = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("residents").delete().eq("id", id);

      if (error) throw error;

      setResidents((prev) => prev.filter((r) => r.id !== id));
      return true;
    } catch (err) {
      console.error("Error deleting resident:", err);
      toast.error("Failed to delete resident");
      return false;
    }
  };

  return { residents, loading, addResident, updateResident, deleteResident, refetch: fetchResidents };
};
