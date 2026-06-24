import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Festival {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  city: string | null;
  location_name: string | null;
  latitude: number;
  longitude: number;
  start_date: string | null;
  end_date: string | null;
  year: number | null;
  website_url: string | null;
  logo_url: string | null;
  genres: string[] | null;
  lineup_summary: string | null;
  description: string | null;
  source_url: string | null;
  /** [lng, lat] convenience tuple for mapbox */
  center: [number, number];
}

export const useFestivals = () => {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("festivals")
        .select("*")
        .order("start_date", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("[useFestivals] load error", error);
        setFestivals([]);
      } else {
        setFestivals(
          (data ?? []).map((f: any) => ({
            ...f,
            center: [Number(f.longitude), Number(f.latitude)] as [number, number],
          })),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { festivals, loading };
};
