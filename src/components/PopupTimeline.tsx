import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PopupVillage {
  id: string;
  name: string;
  logo: string;
  center: [number, number];
  dates: string;
  location: string;
  description: string;
  participants?: string;
  focus?: string;
}

interface PopupTimelineProps {
  villages: PopupVillage[];
  activeVillage: PopupVillage;
  isZoomedIn?: boolean;
  onVillageClick: (village: PopupVillage) => void;
}

// Parse date string to get start and end dates
const parseDateRange = (dateStr: string): { start: Date | null; end: Date | null } => {
  // Handle "Coming 2026" or similar
  if (dateStr.toLowerCase().includes("coming")) {
    return { start: null, end: null };
  }

  const months: { [key: string]: number } = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  try {
    // Handle simple month-only format like "May 2025" or "Aug 2025"
    const simpleMonthMatch = dateStr.match(/^([a-zA-Z]+)\s+(\d{4})$/);
    if (simpleMonthMatch) {
      const month = months[simpleMonthMatch[1].toLowerCase().slice(0, 3)];
      const year = parseInt(simpleMonthMatch[2]);
      if (month !== undefined) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0); // Last day of month
        return { start, end };
      }
    }

    // Handle "Apr 1, 2025" single date format
    const singleDateMatch = dateStr.match(/^([a-zA-Z]+)\s+(\d+),?\s+(\d{4})$/);
    if (singleDateMatch) {
      const month = months[singleDateMatch[1].toLowerCase().slice(0, 3)];
      const day = parseInt(singleDateMatch[2]);
      const year = parseInt(singleDateMatch[3]);
      if (month !== undefined) {
        const date = new Date(year, month, day);
        return { start: date, end: new Date(year, month, day + 1) }; // Show as 1-day event
      }
    }

    // Parse formats like "Jan 15 – Feb 15, 2026" or "Mar 2 – 7, 2025" or "Dec 8, 2025 – Mar 2, 2026"
    // Split by dash/en-dash
    const parts = dateStr.split(/[–-]/);
    if (parts.length !== 2) return { start: null, end: null };

    const startPart = parts[0].trim();
    const endPart = parts[1].trim();

    // Extract year from end part
    const yearMatch = endPart.match(/(\d{4})/);
    const endYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

    // Parse start date
    const startMonthMatch = startPart.match(/([a-zA-Z]+)/);
    const startDayMatch = startPart.match(/(\d+)/);
    
    if (!startMonthMatch || !startDayMatch) return { start: null, end: null };
    
    const startMonth = months[startMonthMatch[1].toLowerCase().slice(0, 3)];
    const startDay = parseInt(startDayMatch[1]);
    
    // Check if start has its own year
    const startYearMatch = startPart.match(/(\d{4})/);
    const startYear = startYearMatch ? parseInt(startYearMatch[1]) : endYear;

    // Parse end date
    const endMonthMatch = endPart.match(/([a-zA-Z]+)/);
    const endDayMatch = endPart.match(/(\d+)/);
    
    let endMonth = startMonth;
    let endDay = 28;
    
    if (endMonthMatch) {
      endMonth = months[endMonthMatch[1].toLowerCase().slice(0, 3)];
    }
    if (endDayMatch) {
      endDay = parseInt(endDayMatch[1]);
    }

    const start = new Date(startYear, startMonth, startDay);
    const end = new Date(endYear, endMonth, endDay);

    return { start, end };
  } catch {
    return { start: null, end: null };
  }
};

// Get the position and width as percentages for a 12-month timeline
const getTimelinePosition = (
  start: Date,
  end: Date,
  timelineStart: Date,
  timelineEnd: Date
): { left: number; width: number } => {
  const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
  
  const clampedStart = Math.max(start.getTime(), timelineStart.getTime());
  const clampedEnd = Math.min(end.getTime(), timelineEnd.getTime());
  
  const left = ((clampedStart - timelineStart.getTime()) / totalDuration) * 100;
  const width = ((clampedEnd - clampedStart) / totalDuration) * 100;
  
  return { left: Math.max(0, left), width: Math.max(1, Math.min(width, 100 - left)) };
};

// Color palette for villages and conferences
const villageColors: { [key: string]: string } = {
  // Popup villages
  "proof-of-retreat": "#8E9456",
  "network-school-v2": "#4A5568",
  "ethchiangmai": "#6B7280",
  "mars-college": "#C4733B",
  "arc-montenegro": "#2D3748",
  "ipe-village-ii": "#48BB78",
  "zuafrique-2": "#ED8936",
  "edge-esmeralda": "#667EEA",
  "edge-city-austin": "#667EEA",
  // Conferences - ETHGlobal events (purple)
  "ethglobal-singapore-2025": "#7C3AED",
  "ethglobal-london-2025": "#7C3AED",
  "ethglobal-brussels-2024": "#7C3AED",
  "ethglobal-sanfrancisco-2024": "#7C3AED",
  "ethglobal-bangkok-2024": "#7C3AED",
  "ethglobal-istanbul-2023": "#7C3AED",
  "ethglobal-tokyo-2024": "#7C3AED",
  "ethglobal-sydney-2024": "#7C3AED",
  "ethglobal-newyork-2024": "#7C3AED",
  "ethglobal-waterloo-2024": "#7C3AED",
  "ethglobal-paris-2024": "#7C3AED",
  "ethglobal-lisbon-2023": "#7C3AED",
  "ethglobal-cannes-2025": "#7C3AED",
  // Major conferences (blue)
  "ethdenver-2025": "#3B82F6",
  "ethcc-cannes-2025": "#EC4899",
  "ethcc-brussels-2024": "#EC4899",
  "consensus-hk-2025": "#F59E0B",
  "devcon-7": "#10B981",
  "devconnect-2025": "#10B981",
  "edcon-2025": "#6366F1",
  // Regional ETH events (teal/cyan)
  "eth-seoul-2025": "#14B8A6",
  "ethmumbai-2025": "#14B8A6",
  "ethprague-2025": "#14B8A6",
  "ethberlin-2025": "#14B8A6",
  "ethwarsaw-2025": "#14B8A6",
  "ethportugal-2025": "#14B8A6",
  "ethdam-2025": "#14B8A6",
  "ethoxford-2025": "#14B8A6",
  "etherindia-2025": "#14B8A6",
  "ethlatam-2025": "#F97316",
  "ethargentina-2025": "#F97316",
  "ethbrasil-2025": "#F97316",
  "ethmexico-2025": "#F97316",
  "ethbogota-2025": "#F97316",
  "ethbucharest-2025": "#14B8A6",
  "ethzurich-2025": "#14B8A6",
  "ethvienna-2025": "#14B8A6",
  "ethkl-2025": "#14B8A6",
  "ethshanghai-2025": "#14B8A6",
  "ethbeijing-2025": "#14B8A6",
  "ethcapetown-2025": "#14B8A6",
  "ethdubai-2025": "#14B8A6",
  // Other
  "dappcon-2025": "#8B5CF6",
  "nftnyc-2025": "#EF4444",
};

export const PopupTimeline = ({ villages, activeVillage, isZoomedIn = false, onVillageClick }: PopupTimelineProps) => {
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(true);
  
  // Auto-collapse when zoomed in, but allow manual override
  const isExpanded = isZoomedIn ? false : isManuallyExpanded;

  // Create a 12-month timeline starting from current month
  const { timelineStart, timelineEnd, months, todayPosition } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 12, 0);
    
    const monthLabels: { label: string; position: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const month = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const position = (i / 12) * 100;
      monthLabels.push({
        label: month.toLocaleDateString("en-US", { month: "short" }),
        position,
      });
    }
    
    // Calculate today's position
    const totalDuration = end.getTime() - start.getTime();
    const todayPos = ((now.getTime() - start.getTime()) / totalDuration) * 100;
    
    return { timelineStart: start, timelineEnd: end, months: monthLabels, todayPosition: Math.max(0, Math.min(100, todayPos)) };
  }, []);

  // Calculate positions for each village
  const villagePositions = useMemo(() => {
    return villages
      .map((village) => {
        const { start, end } = parseDateRange(village.dates);
        if (!start || !end) return null;
        
        // Check if event is within our timeline range
        if (end < timelineStart || start > timelineEnd) return null;
        
        const position = getTimelinePosition(start, end, timelineStart, timelineEnd);
        return { village, position, start, end };
      })
      .filter(Boolean) as { village: PopupVillage; position: { left: number; width: number }; start: Date; end: Date }[];
  }, [villages, timelineStart, timelineEnd]);

  // Group overlapping villages into rows
  const rows = useMemo(() => {
    const result: typeof villagePositions[] = [];
    
    villagePositions.forEach((item) => {
      let placed = false;
      for (const row of result) {
        const overlaps = row.some((existing) => {
          const itemEnd = item.position.left + item.position.width;
          const existingEnd = existing.position.left + existing.position.width;
          return !(itemEnd <= existing.position.left || item.position.left >= existingEnd);
        });
        
        if (!overlaps) {
          row.push(item);
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        result.push([item]);
      }
    });
    
    return result;
  }, [villagePositions]);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      {/* Collapsed state - hide button when zoomed in */}
      {!isExpanded && !isZoomedIn && (
        <div className="flex items-center justify-center px-4 pb-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsManuallyExpanded(true)}
            className="gap-2 rounded-full bg-card/95 shadow-lg backdrop-blur-sm"
          >
            <Calendar className="h-4 w-4" />
            <span>Show Timeline</span>
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Expanded state */}
      {isExpanded && (
        <div className="bg-gradient-to-t from-background/95 via-background/80 to-transparent px-4 pb-4 pt-8 md:px-6">
          {/* Collapse button */}
          <div className="mb-2 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsManuallyExpanded(false)}
              className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className="h-3 w-3" />
              Hide
            </Button>
          </div>

          {/* Month labels */}
          <div className="relative mb-2 h-6">
            {months.map((month, i) => (
              <div
                key={i}
                className="absolute text-xs font-medium text-muted-foreground"
                style={{ left: `${month.position}%` }}
              >
                {month.label}
              </div>
            ))}
          </div>
          
          {/* Timeline track */}
          <div className="relative rounded-lg bg-secondary/30 backdrop-blur-sm" style={{ minHeight: `${Math.max(1, rows.length) * 32 + 8}px` }}>
            {/* Grid lines */}
            <div className="absolute inset-0 flex">
              {months.map((_, i) => (
                <div
                  key={i}
                  className="h-full border-l border-border/30"
                  style={{ width: `${100 / 12}%` }}
                />
              ))}
            </div>

            {/* Today marker */}
            <div
              className="absolute top-0 z-10 h-full w-0.5 bg-primary"
              style={{ left: `${todayPosition}%` }}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                Today
              </div>
            </div>
            
            {/* Village bars */}
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="relative h-8">
                {row.map(({ village, position }) => (
                  <button
                    key={village.id}
                    onClick={() => onVillageClick(village)}
                    className={`absolute top-1 flex h-6 items-center gap-1 overflow-hidden rounded-full px-2 text-xs font-medium text-white transition-all hover:scale-105 hover:shadow-lg ${
                      activeVillage.id === village.id ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                    }`}
                    style={{
                      left: `${position.left}%`,
                      width: `${position.width}%`,
                      minWidth: "60px",
                      backgroundColor: villageColors[village.id] || "#6B7280",
                    }}
                    title={`${village.name}\n${village.dates}`}
                  >
                    <img src={village.logo} alt="" className="h-4 w-4 shrink-0 rounded-sm" />
                    <span className="truncate">{village.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
