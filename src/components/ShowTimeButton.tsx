import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const ShowTimeButton = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSetting = async () => {
      try {
        const { data } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "showtime_enabled")
          .maybeSingle();
        
        setIsEnabled(data?.value === "true");
      } catch (error) {
        console.error("Error fetching showtime setting:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSetting();
  }, []);

  if (loading || !isEnabled) return null;

  return (
    <Button
      onClick={() => window.open("https://showtime.xyz", "_blank")}
      className="bg-[#2A2520] hover:bg-[#3A3530] text-[#D4C8A8] border border-[#4A4540] shadow-lg gap-2 font-display"
    >
      <Sparkles className="h-4 w-4 text-[#E8D878]" />
      <span className="hidden sm:inline">Show Time</span>
    </Button>
  );
};
