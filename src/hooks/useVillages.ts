import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Village {
  id: string;
  name: string;
  logo_url: string | null;
  center: [number, number];
  dates: string;
  location: string;
  description: string;
  participants: string | null;
  focus: string | null;
  luma_calendar_id: string | null;
  telegram_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  wallet_address: string | null;
  solana_wallet_address: string | null;
  website_url: string | null;
  apply_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VillageInput {
  id: string;
  name: string;
  logo_url?: string;
  center: [number, number];
  dates: string;
  location: string;
  description: string;
  participants?: string;
  focus?: string;
  luma_calendar_id?: string;
  created_by?: string;
}

export const useVillages = () => {
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVillages = async () => {
    try {
      const { data, error } = await supabase
        .from("villages")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const mappedVillages: Village[] = (data || []).map((v: any) => ({
        ...v,
        center: v.center as [number, number],
        created_by: v.created_by || null,
      }));

      setVillages(mappedVillages);
    } catch (err) {
      console.error("Error fetching villages:", err);
      toast.error("Failed to load villages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVillages();
  }, []);

  const addVillage = async (village: VillageInput): Promise<Village | null> => {
    try {
      const { data, error } = await supabase
        .from("villages")
        .insert({
          id: village.id,
          name: village.name,
          logo_url: village.logo_url || null,
          center: village.center,
          dates: village.dates,
          location: village.location,
          description: village.description,
          participants: village.participants || null,
          focus: village.focus || null,
          luma_calendar_id: village.luma_calendar_id || null,
          created_by: village.created_by || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const newVillage: Village = {
        ...data,
        center: data.center as [number, number],
      } as Village;

      setVillages((prev) => [...prev, newVillage]);
      return newVillage;
    } catch (err) {
      console.error("Error adding village:", err);
      toast.error("Failed to add village");
      return null;
    }
  };

  const updateVillage = async (id: string, updates: Partial<VillageInput>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("villages")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setVillages((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
      );
      return true;
    } catch (err) {
      console.error("Error updating village:", err);
      toast.error("Failed to update village");
      return false;
    }
  };

  const deleteVillage = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("villages").delete().eq("id", id);

      if (error) throw error;

      setVillages((prev) => prev.filter((v) => v.id !== id));
      return true;
    } catch (err) {
      console.error("Error deleting village:", err);
      toast.error("Failed to delete village");
      return false;
    }
  };

  return { villages, loading, addVillage, updateVillage, deleteVillage, refetch: fetchVillages };
};
