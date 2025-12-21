import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DbSpot {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  category: "accommodation" | "food" | "activity" | "work";
  coordinates: [number, number];
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface SpotInput {
  name: string;
  description: string;
  image_url?: string;
  category: "accommodation" | "food" | "activity" | "work";
  coordinates: [number, number];
  tags?: string[];
}

export interface SpotUpdate {
  name?: string;
  description?: string;
  image_url?: string;
  category?: "accommodation" | "food" | "activity" | "work";
  tags?: string[];
}

export const useSpots = () => {
  const [spots, setSpots] = useState<DbSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("spots")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Transform coordinates from JSONB to tuple
      const transformedSpots = (data || []).map((spot) => ({
        ...spot,
        category: spot.category as DbSpot["category"],
        coordinates: spot.coordinates as [number, number],
      }));

      setSpots(transformedSpots);
      setError(null);
    } catch (err) {
      console.error("Error fetching spots:", err);
      setError("Failed to load spots");
    } finally {
      setLoading(false);
    }
  };

  const addSpot = async (spot: SpotInput): Promise<DbSpot | null> => {
    try {
      const { data, error } = await supabase
        .from("spots")
        .insert({
          name: spot.name,
          description: spot.description,
          image_url: spot.image_url || null,
          category: spot.category,
          coordinates: spot.coordinates,
          tags: spot.tags || [],
        })
        .select()
        .single();

      if (error) throw error;

      const newSpot: DbSpot = {
        ...data,
        category: data.category as DbSpot["category"],
        coordinates: data.coordinates as [number, number],
      };

      setSpots((prev) => [...prev, newSpot]);
      return newSpot;
    } catch (err) {
      console.error("Error adding spot:", err);
      toast.error("Failed to add spot");
      return null;
    }
  };

  const updateSpotCoordinates = async (
    spotId: string,
    coordinates: [number, number]
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("spots")
        .update({ coordinates })
        .eq("id", spotId);

      if (error) throw error;

      setSpots((prev) =>
        prev.map((s) => (s.id === spotId ? { ...s, coordinates } : s))
      );
      return true;
    } catch (err) {
      console.error("Error updating spot coordinates:", err);
      toast.error("Failed to update location");
      return false;
    }
  };

  const deleteSpot = async (spotId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("spots").delete().eq("id", spotId);

      if (error) throw error;

      setSpots((prev) => prev.filter((s) => s.id !== spotId));
      return true;
    } catch (err) {
      console.error("Error deleting spot:", err);
      toast.error("Failed to delete spot");
      return false;
    }
  };

  const updateSpot = async (spotId: string, updates: SpotUpdate): Promise<DbSpot | null> => {
    try {
      const { data, error } = await supabase
        .from("spots")
        .update(updates)
        .eq("id", spotId)
        .select()
        .single();

      if (error) throw error;

      const updatedSpot: DbSpot = {
        ...data,
        category: data.category as DbSpot["category"],
        coordinates: data.coordinates as [number, number],
      };

      setSpots((prev) =>
        prev.map((s) => (s.id === spotId ? updatedSpot : s))
      );
      return updatedSpot;
    } catch (err) {
      console.error("Error updating spot:", err);
      toast.error("Failed to update spot");
      return null;
    }
  };

  useEffect(() => {
    fetchSpots();
  }, []);

  return { spots, loading, error, addSpot, updateSpotCoordinates, deleteSpot, updateSpot, refetch: fetchSpots };
};
