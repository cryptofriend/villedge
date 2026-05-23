import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface HousingRoom {
  id: string;
  spot_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  capacity: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomBooking {
  id: string;
  room_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface BookingWithProfile extends RoomBooking {
  username: string | null;
  avatar_url: string | null;
}

export const useHousingRooms = (spotId: string | null) => {
  const [rooms, setRooms] = useState<HousingRoom[]>([]);
  const [bookings, setBookings] = useState<BookingWithProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!spotId) {
      setRooms([]);
      setBookings([]);
      return;
    }
    setLoading(true);
    try {
      const { data: roomsData, error: roomsErr } = await supabase
        .from("housing_rooms")
        .select("*")
        .eq("spot_id", spotId)
        .order("created_at", { ascending: true });
      if (roomsErr) throw roomsErr;

      const roomList = (roomsData || []) as HousingRoom[];
      setRooms(roomList);

      const ids = roomList.map((r) => r.id);
      if (ids.length === 0) {
        setBookings([]);
        return;
      }

      const { data: bData, error: bErr } = await supabase
        .rpc("get_room_availability", { _room_ids: ids });
      if (bErr) throw bErr;

      setBookings(
        (bData || []).map((b: any) => ({
          id: b.id,
          room_id: b.room_id,
          start_date: b.start_date,
          end_date: b.end_date,
          status: b.status,
          user_id: null,
          notes: null,
          created_at: null,
          updated_at: null,
          username: b.username ?? null,
          avatar_url: b.avatar_url ?? null,
        }))
      );
    } catch (err) {
      console.error("Error fetching rooms/bookings:", err);
    } finally {
      setLoading(false);
    }
  }, [spotId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addRoom = async (
    input: { name: string; description?: string; price: number; currency?: string; capacity?: number }
  ) => {
    if (!spotId) return null;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("housing_rooms")
      .insert({
        spot_id: spotId,
        name: input.name,
        description: input.description || null,
        price: input.price,
        currency: input.currency || "USD",
        capacity: input.capacity || 1,
        created_by: user?.id ?? null,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    setRooms((p) => [...p, data as HousingRoom]);
    return data as HousingRoom;
  };

  const updateRoom = async (id: string, updates: Partial<Pick<HousingRoom, "name" | "description" | "price" | "currency" | "capacity">>) => {
    const { data, error } = await supabase
      .from("housing_rooms")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    setRooms((p) => p.map((r) => (r.id === id ? (data as HousingRoom) : r)));
    return data as HousingRoom;
  };

  const deleteRoom = async (id: string) => {
    const { error } = await supabase.from("housing_rooms").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    setRooms((p) => p.filter((r) => r.id !== id));
    setBookings((p) => p.filter((b) => b.room_id !== id));
    return true;
  };

  const bookRoom = async (roomId: string, startDate: string, endDate: string, notes?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in to book a room");
      return null;
    }
    const { data, error } = await supabase
      .from("room_bookings")
      .insert({
        room_id: roomId,
        user_id: user.id,
        start_date: startDate,
        end_date: endDate,
        status: "confirmed",
        notes: notes || null,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    toast.success("Room booked");

    // Fire-and-forget notification + relay setup
    try {
      const room = rooms.find((r) => r.id === roomId);
      let spotName: string | undefined;
      let villageId: string | undefined;
      let hostUserId: string | undefined;
      if (room?.spot_id) {
        const { data: spot } = await supabase
          .from("spots")
          .select("name, village_id, created_by")
          .eq("id", room.spot_id)
          .maybeSingle();
        spotName = spot?.name ?? undefined;
        villageId = spot?.village_id ?? undefined;
        hostUserId = spot?.created_by ?? undefined;
      }

      // Warn if host has no Telegram linked — relay won't work end-to-end
      if (hostUserId) {
        const { data: hostProfileData } = await supabase
          .rpc("get_safe_profile_data", { target_user_id: hostUserId });
        const hostProfile = Array.isArray(hostProfileData) ? hostProfileData[0] : hostProfileData;
        if (!hostProfile?.telegram_id) {
          toast.warning("Host hasn't connected Telegram — they'll be notified in the village chat instead of receiving a direct message.");
        }
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: notifyData } = await supabase.functions.invoke("notify-telegram", {
        body: {
          type: "booking",
          villageId,
          spotName,
          roomName: room?.name,
          bookerName: profile?.username || "Someone",
          startDate,
          endDate,
          price: room?.price,
          bookingId: (data as RoomBooking).id,
          hostUserId,
          bookerUserId: user.id,
        },
      });

      const guestLink = (notifyData as any)?.guestRelayLink as string | undefined;
      if (guestLink) {
        toast("Chat with the host on Telegram", {
          description: "Tap to enable two-way messaging through @villedgebot.",
          action: {
            label: "Open chat",
            onClick: () => window.open(guestLink, "_blank"),
          },
          duration: 12000,
        });
      }
    } catch (e) {
      console.log("Booking notification setup failed:", e);
    }
    await fetchAll();
    return data as RoomBooking;
  };

  const cancelBooking = async (bookingId: string) => {
    const { error } = await supabase.from("room_bookings").delete().eq("id", bookingId);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Booking cancelled");
    setBookings((p) => p.filter((b) => b.id !== bookingId));
    return true;
  };

  return { rooms, bookings, loading, addRoom, updateRoom, deleteRoom, bookRoom, cancelBooking, refetch: fetchAll };
};
