import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Village } from "./useVillages";

interface UseUserCurrentVillageResult {
  currentVillage: Village | null;
  loading: boolean;
}

/**
 * Gets the user's current village based on their active stay,
 * or falls back to the currently active popup village.
 */
export const useUserCurrentVillage = (
  userId: string | undefined,
  villages: Village[]
): UseUserCurrentVillageResult => {
  const [currentVillage, setCurrentVillage] = useState<Village | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const findCurrentVillage = async () => {
      setLoading(true);
      
      const today = new Date().toISOString().split("T")[0];
      
      // If user is authenticated, try to find their current/upcoming stay
      if (userId) {
        const { data: userStays } = await supabase
          .from("stays")
          .select("village_id, start_date, end_date")
          .eq("user_id", userId)
          .order("start_date", { ascending: true });

        if (userStays && userStays.length > 0) {
          // Find an active stay (today is between start and end)
          const activeStay = userStays.find(
            (stay) => stay.start_date <= today && stay.end_date >= today
          );

          // Or find the next upcoming stay
          const upcomingStay = userStays.find(
            (stay) => stay.start_date > today
          );

          const targetStay = activeStay || upcomingStay || userStays[0];
          
          if (targetStay) {
            const userVillage = villages.find((v) => v.id === targetStay.village_id);
            if (userVillage) {
              setCurrentVillage(userVillage);
              setLoading(false);
              return;
            }
          }
        }
      }

      // Fallback: find the currently active popup village
      const activePopup = findActivePopupVillage(villages, today);
      setCurrentVillage(activePopup);
      setLoading(false);
    };

    if (villages.length > 0) {
      findCurrentVillage();
    } else {
      setLoading(false);
    }
  }, [userId, villages]);

  return { currentVillage, loading };
};

/**
 * Parse village dates to find the currently active popup.
 * Dates format examples: "Jan 15 - Feb 28, 2026", "March 1-15, 2026"
 */
function findActivePopupVillage(villages: Village[], today: string): Village | null {
  const popupVillages = villages.filter((v) => v.village_type === "popup");
  
  if (popupVillages.length === 0) return null;

  const todayDate = new Date(today);

  for (const village of popupVillages) {
    const dateRange = parseDateRange(village.dates);
    if (dateRange) {
      const { start, end } = dateRange;
      if (todayDate >= start && todayDate <= end) {
        return village;
      }
    }
  }

  // If no active popup, find the next upcoming one
  let nextUpcoming: Village | null = null;
  let nextStartDate: Date | null = null;

  for (const village of popupVillages) {
    const dateRange = parseDateRange(village.dates);
    if (dateRange && dateRange.start > todayDate) {
      if (!nextStartDate || dateRange.start < nextStartDate) {
        nextStartDate = dateRange.start;
        nextUpcoming = village;
      }
    }
  }

  // Return next upcoming, or fallback to first popup
  return nextUpcoming || popupVillages[0];
}

/**
 * Parse date strings like "Jan 15 - Feb 28, 2026" or "March 1-15, 2026"
 */
function parseDateRange(dateStr: string): { start: Date; end: Date } | null {
  if (!dateStr) return null;

  try {
    // Handle "Permanent" or similar
    if (dateStr.toLowerCase().includes("permanent")) {
      return null;
    }

    // Extract year from the string
    const yearMatch = dateStr.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

    // Try to parse "Month Day - Month Day, Year" format
    const rangeMatch = dateStr.match(
      /([A-Za-z]+)\s*(\d+)\s*[-–]\s*([A-Za-z]+)?\s*(\d+)/
    );

    if (rangeMatch) {
      const startMonth = rangeMatch[1];
      const startDay = parseInt(rangeMatch[2]);
      const endMonth = rangeMatch[3] || startMonth;
      const endDay = parseInt(rangeMatch[4]);

      const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
      const endDate = new Date(`${endMonth} ${endDay}, ${year}`);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { start: startDate, end: endDate };
      }
    }

    return null;
  } catch {
    return null;
  }
}
