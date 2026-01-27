import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Stay {
  id: string;
  village_id: string;
  nickname: string;
  villa: string;
  start_date: string;
  end_date: string;
  intention: string | null;
  social_profile: string | null;
  offerings: string | null;
  asks: string | null;
  secret_hash: string;
  is_host: boolean;
  created_at: string;
  project_description: string | null;
  project_url: string | null;
  status: "planning" | "confirmed" | null;
  user_id: string | null;
  is_anon?: boolean; // From joined profile
}

export interface StayInput {
  village_id: string;
  nickname: string;
  villa: string;
  start_date: string;
  end_date: string;
  intention?: string;
  social_profile?: string;
  offerings?: string;
  asks?: string;
  secret_hash?: string;
  project_description?: string;
  project_url?: string;
  is_host?: boolean;
  status?: "planning" | "confirmed";
  user_id?: string;
}

// Simple hash function for secret codes
export const hashSecret = async (secret: string): Promise<string> => {
  if (!secret) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", new Uint8Array(data).buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const useStays = (villageId?: string) => {
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStays = useCallback(async () => {
    if (!villageId) {
      setStays([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch stays with profile is_anon status
      const { data, error } = await supabase
        .from("stays")
        .select("*, profiles:user_id(is_anon)")
        .eq("village_id", villageId)
        .order("start_date", { ascending: true });

      if (error) throw error;
      
      // Map the joined data to include is_anon
      const staysWithAnon = (data || []).map((stay: any) => ({
        ...stay,
        is_anon: stay.profiles?.is_anon ?? false,
        profiles: undefined, // Remove the nested object
      }));
      
      setStays(staysWithAnon as Stay[]);
    } catch (err) {
      console.error("Error fetching stays:", err);
      toast.error("Failed to load stays");
    } finally {
      setLoading(false);
    }
  }, [villageId]);

  useEffect(() => {
    fetchStays();

    if (!villageId) return;

    // Set up realtime subscription
    const channel = supabase
      .channel(`stays-${villageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stays",
          filter: `village_id=eq.${villageId}`,
        },
        () => fetchStays()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [villageId, fetchStays]);

  const addStay = async (stay: StayInput): Promise<Stay | null> => {
    try {
      const { data, error } = await supabase
        .from("stays")
        .insert(stay)
        .select()
        .single();

      if (error) throw error;
      
      // Trigger resident notification (non-blocking)
      (async () => {
        try {
          // Check if there's a notification route enabled for residents in this village
          const { data: route } = await supabase
            .from("notification_routes")
            .select("chat_id, thread_id, is_enabled")
            .eq("village_id", stay.village_id)
            .eq("notification_type", "resident")
            .eq("is_enabled", true)
            .maybeSingle();
          
          if (route) {
            const stayDates = `${stay.start_date} → ${stay.end_date}`;
            
            // Determine which bot token to use based on village
            const villageBotTokenMap: Record<string, string> = {
              'protoville': 'PROTOVILLE_BOT_TOKEN',
              'proof-of-retreat': 'TELEGRAM_BOT_TOKEN',
            };
            const botTokenSecretName = villageBotTokenMap[stay.village_id] || 'TELEGRAM_BOT_TOKEN';
            
            const { error: notifyError } = await supabase.functions.invoke("notify-telegram", {
              body: {
                type: "resident",
                residentName: stay.nickname,
                stayDates,
                intention: stay.intention,
                socialProfile: stay.social_profile,
                villageId: stay.village_id,
                testChatId: route.chat_id,
                testThreadId: route.thread_id,
                botTokenSecretName
              }
            });
            if (notifyError) {
              console.warn("Telegram notification failed (non-blocking):", notifyError);
            }
          }
        } catch (notifyErr) {
          console.warn("Error sending resident notification (non-blocking):", notifyErr);
        }
      })();
      
      toast.success("Stay added successfully!");
      return data as Stay;
    } catch (err) {
      console.error("Error adding stay:", err);
      toast.error("Failed to add stay");
      return null;
    }
  };

  const updateStay = async (
    id: string,
    updates: Partial<StayInput>,
    secretCode: string
  ): Promise<boolean> => {
    try {
      // First verify the secret hash
      const { data: existingStay } = await supabase
        .from("stays")
        .select("secret_hash")
        .eq("id", id)
        .single();

      if (existingStay) {
        const inputHash = await hashSecret(secretCode);
        if (existingStay.secret_hash && existingStay.secret_hash !== inputHash) {
          toast.error("Invalid secret code");
          return false;
        }
      }

      const { error } = await supabase.from("stays").update(updates).eq("id", id);

      if (error) throw error;
      toast.success("Stay updated successfully!");
      return true;
    } catch (err) {
      console.error("Error updating stay:", err);
      toast.error("Failed to update stay");
      return false;
    }
  };

  const deleteStay = async (id: string, secretCode: string): Promise<boolean> => {
    try {
      // First verify the secret hash
      const { data: existingStay } = await supabase
        .from("stays")
        .select("secret_hash")
        .eq("id", id)
        .single();

      if (existingStay) {
        const inputHash = await hashSecret(secretCode);
        if (existingStay.secret_hash && existingStay.secret_hash !== inputHash) {
          toast.error("Invalid secret code");
          return false;
        }
      }

      const { error } = await supabase.from("stays").delete().eq("id", id);

      if (error) throw error;
      toast.success("Stay deleted successfully!");
      return true;
    } catch (err) {
      console.error("Error deleting stay:", err);
      toast.error("Failed to delete stay");
      return false;
    }
  };

  const toggleStayStatus = async (id: string, currentUserId: string | null): Promise<boolean> => {
    try {
      // Get the stay to check ownership and current status
      const { data: existingStay, error: fetchError } = await supabase
        .from("stays")
        .select("status, user_id")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Check if user owns this stay
      if (!existingStay.user_id || existingStay.user_id !== currentUserId) {
        toast.error("You can only update your own stays");
        return false;
      }

      const newStatus = existingStay.status === "confirmed" ? "planning" : "confirmed";

      const { error } = await supabase
        .from("stays")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      
      toast.success(`Stay ${newStatus === "confirmed" ? "confirmed" : "set to planning"}!`);
      return true;
    } catch (err) {
      console.error("Error toggling stay status:", err);
      toast.error("Failed to update stay status");
      return false;
    }
  };

  const updateStayByOwner = async (
    id: string,
    updates: Partial<StayInput>,
    currentUserId: string | null
  ): Promise<boolean> => {
    try {
      // Get the stay to check ownership
      const { data: existingStay, error: fetchError } = await supabase
        .from("stays")
        .select("user_id")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Check if user owns this stay
      if (!existingStay.user_id || existingStay.user_id !== currentUserId) {
        toast.error("You can only update your own stays");
        return false;
      }

      const { error } = await supabase
        .from("stays")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Stay updated successfully!");
      return true;
    } catch (err) {
      console.error("Error updating stay:", err);
      toast.error("Failed to update stay");
      return false;
    }
  };

  // Delete stay as host (bypasses secret code requirement)
  const deleteStayAsHost = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from("stays").delete().eq("id", id);

      if (error) throw error;
      toast.success("Stay removed successfully!");
      return true;
    } catch (err) {
      console.error("Error deleting stay:", err);
      toast.error("Failed to remove stay");
      return false;
    }
  };

  // Update stay as host (for status changes, bypasses ownership check)
  const updateStayAsHost = async (
    id: string,
    updates: Partial<StayInput>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("stays")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Stay updated successfully!");
      return true;
    } catch (err) {
      console.error("Error updating stay:", err);
      toast.error("Failed to update stay");
      return false;
    }
  };

  return { stays, loading, addStay, updateStay, deleteStay, toggleStayStatus, updateStayByOwner, deleteStayAsHost, updateStayAsHost, refetch: fetchStays };
};
