import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import {
  format,
  parseISO,
  eachDayOfInterval,
  differenceInDays,
  isToday,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import { Stay } from "@/hooks/useStays";
import { OccupancyChart } from "./OccupancyChart";
import { ResidentProfileCard } from "./ResidentProfileCard";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ExternalLink, Twitter, Instagram, Github, Linkedin, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBestAvatar } from "@/lib/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

interface StayGanttTimelineProps {
  stays: Stay[];
  loading: boolean;
  onEditStay?: (stay: Stay) => void;
  onDeleteStay?: (stay: Stay) => void;
  isHost?: boolean;
}

// Generate consistent colors based on nickname
const getColorForNickname = (nickname: string, status?: string | null): { bg: string; border: string; opacity: string } => {
  const colors = [
    { confirmed: "bg-emerald-500", planning: "bg-emerald-400/60" },
    { confirmed: "bg-blue-500", planning: "bg-blue-400/60" },
    { confirmed: "bg-amber-500", planning: "bg-amber-400/60" },
    { confirmed: "bg-purple-500", planning: "bg-purple-400/60" },
    { confirmed: "bg-rose-500", planning: "bg-rose-400/60" },
    { confirmed: "bg-cyan-500", planning: "bg-cyan-400/60" },
    { confirmed: "bg-orange-500", planning: "bg-orange-400/60" },
    { confirmed: "bg-indigo-500", planning: "bg-indigo-400/60" },
    { confirmed: "bg-teal-500", planning: "bg-teal-400/60" },
    { confirmed: "bg-pink-500", planning: "bg-pink-400/60" },
  ];
  
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colorSet = colors[Math.abs(hash) % colors.length];
  const isPlanning = status === "planning";
  
  return {
    bg: isPlanning ? colorSet.planning : colorSet.confirmed,
    border: isPlanning ? "border-2 border-dashed border-current" : "",
    opacity: isPlanning ? "opacity-80" : "",
  };
};

// Detect social network from URL
const getSocialNetwork = (url: string | null): { type: 'twitter' | 'instagram' | 'github' | 'linkedin' | 'other' | null; color: string } => {
  if (!url) return { type: null, color: '' };
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return { type: 'twitter', color: 'text-foreground' };
  }
  if (lowerUrl.includes('instagram.com')) {
    return { type: 'instagram', color: 'text-pink-500' };
  }
  if (lowerUrl.includes('github.com')) {
    return { type: 'github', color: 'text-foreground' };
  }
  if (lowerUrl.includes('linkedin.com')) {
    return { type: 'linkedin', color: 'text-blue-600' };
  }
  return { type: 'other', color: 'text-muted-foreground' };
};

export const StayGanttTimeline = ({ stays, loading, onEditStay, onDeleteStay, isHost }: StayGanttTimelineProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const nameColumnRef = useRef<HTMLDivElement>(null);
  const intentionColumnRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [nameColumnWidth, setNameColumnWidth] = useState(isMobile ? 100 : 120);
  const [intentionColumnWidth, setIntentionColumnWidth] = useState(140);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<'name' | 'intention' | null>(null);
  const [selectedResidentKey, setSelectedResidentKey] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const dayWidth = isMobile ? 20 : 28;

  // Calculate date range from stays
  const dateRange = useMemo(() => {
    if (stays.length === 0) {
      const today = new Date();
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 2, 0),
      };
    }

    const allDates = stays.flatMap((stay) => [
      parseISO(stay.start_date),
      parseISO(stay.end_date),
    ]);

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    // Add some padding
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);

    return { start: minDate, end: maxDate };
  }, [stays]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange]);

  // Group stays by a stable key to avoid collapsing multiple "Anonymous" users into one row.
  // - If user_id is visible (host/owner), group by user_id (merges multiple stays per person)
  // - Otherwise, group by stay.id (each anonymous stay stays distinct)
  const staysByResident = useMemo(() => {
    const grouped = new Map<string, { label: string; stays: Stay[] }>();
    stays.forEach((stay) => {
      const key = stay.user_id ?? stay.id;
      const existing = grouped.get(key);
      if (existing) {
        existing.stays.push(stay);
      } else {
        grouped.set(key, { label: stay.nickname, stays: [stay] });
      }
    });
    return grouped;
  }, [stays]);

  // Helper to check if a stay should be blurred - uses backend-enforced visibility
  const shouldBlurStay = (stay: Stay): boolean => {
    // Backend now handles all visibility logic via is_visible flag
    // If is_visible is true, the data is already real; if false, it's already anonymized
    // We still blur for visual indication, but the actual data is already protected
    return !(stay.is_visible ?? false);
  };

  // Month headers
  const monthHeaders = useMemo(() => {
    const headers: { month: Date; startIndex: number; span: number }[] = [];
    let currentMonth: Date | null = null;
    let currentStartIndex = 0;
    let currentSpan = 0;

    days.forEach((day, index) => {
      const monthStart = startOfMonth(day);
      if (!currentMonth || !isSameMonth(currentMonth, monthStart)) {
        if (currentMonth) {
          headers.push({ month: currentMonth, startIndex: currentStartIndex, span: currentSpan });
        }
        currentMonth = monthStart;
        currentStartIndex = index;
        currentSpan = 1;
      } else {
        currentSpan++;
      }
    });

    if (currentMonth) {
      headers.push({ month: currentMonth, startIndex: currentStartIndex, span: currentSpan });
    }

    return headers;
  }, [days]);

  // Jump to today
  const jumpToToday = () => {
    if (!scrollContainerRef.current) return;
    const todayIndex = days.findIndex((d) => isToday(d));
    if (todayIndex !== -1) {
      const scrollPosition = todayIndex * dayWidth - scrollContainerRef.current.clientWidth / 2;
      scrollContainerRef.current.scrollTo({ left: scrollPosition, behavior: "smooth" });
    }
  };

  // Handle column resize
  const handleResizeStart = (column: 'name' | 'intention') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setResizingColumn(column);
    const startX = e.clientX;
    const startWidth = column === 'name' ? nameColumnWidth : intentionColumnWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(80, Math.min(300, startWidth + diff));
      if (column === 'name') {
        setNameColumnWidth(newWidth);
      } else {
        setIntentionColumnWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizingColumn(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Sync scroll between all columns and timeline
  const syncScroll = useCallback((scrollTop: number, source: 'name' | 'intention' | 'timeline') => {
    if (isScrolling) return;
    setIsScrolling(true);
    
    if (source !== 'name' && nameColumnRef.current) {
      nameColumnRef.current.scrollTop = scrollTop;
    }
    if (source !== 'intention' && intentionColumnRef.current) {
      intentionColumnRef.current.scrollTop = scrollTop;
    }
    if (source !== 'timeline' && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollTop;
    }
    
    requestAnimationFrame(() => setIsScrolling(false));
  }, [isScrolling]);

  const handleNameScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    syncScroll(e.currentTarget.scrollTop, 'name');
  }, [syncScroll]);

  const handleIntentionScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    syncScroll(e.currentTarget.scrollTop, 'intention');
  }, [syncScroll]);

  const handleTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    syncScroll(e.currentTarget.scrollTop, 'timeline');
  }, [syncScroll]);

  // Auto-scroll to today on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      jumpToToday();
    }, 100);
    return () => clearTimeout(timer);
  }, [days]);

  // Get stays for selected nickname
  const selectedStays = useMemo(() => {
    if (!selectedResidentKey) return [];
    return staysByResident.get(selectedResidentKey)?.stays || [];
  }, [selectedResidentKey, staysByResident]);

  const selectedResidentLabel = useMemo(() => {
    if (!selectedResidentKey) return "";
    return staysByResident.get(selectedResidentKey)?.label || "";
  }, [selectedResidentKey, staysByResident]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Loading stays...
      </div>
    );
  }

  if (stays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <CalendarCheck className="h-12 w-12 mb-3 text-muted-foreground/50" />
        <p>No stays recorded yet</p>
        <p className="text-sm">Add your stay to get started</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Profile Card Dialog */}
      <ResidentProfileCard
        stays={selectedStays}
        nickname={selectedResidentLabel}
        open={!!selectedResidentKey}
        onOpenChange={(open) => !open && setSelectedResidentKey(null)}
      />

      {/* Occupancy Chart - At top for mobile */}
      <div className={cn("mb-3", isMobile ? "" : "flex")}>
        {!isMobile && <div style={{ width: nameColumnWidth }} className="flex-shrink-0" />}
        <div className="flex-1 overflow-hidden">
          <OccupancyChart stays={stays} dateRange={dateRange} dayWidth={dayWidth} isMobile={isMobile} />
        </div>
      </div>


      {/* Timeline with synced scrolling */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Fixed Columns (Name + Intention) */}
        <div className="flex flex-shrink-0">
          {/* Name Column */}
          <div
            className="flex-shrink-0 border-r border-border relative flex flex-col"
            style={{ width: nameColumnWidth }}
          >
            {/* Header */}
            <div className={cn(
              "border-b border-border bg-muted/30 flex items-center justify-center font-semibold text-muted-foreground flex-shrink-0",
              isMobile ? "h-12 text-[10px]" : "h-14 text-xs"
            )}>
              Name
            </div>
            
            {/* Scrollable Names */}
            <div 
              ref={nameColumnRef}
              className="flex-1 overflow-y-auto overflow-x-hidden"
              onScroll={handleNameScroll}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {Array.from(staysByResident.entries()).map(([residentKey, group]) => {
                const nickname = group.label;
                const personStays = group.stays;
                const firstStay = personStays[0];
                const avatarUrl = getBestAvatar(nickname, firstStay?.social_profile || null, 32);
                const socialNetwork = getSocialNetwork(firstStay?.social_profile || null);
                const shouldBlur = shouldBlurStay(firstStay);
                const isCurrentUser = user && firstStay?.user_id === user.id;
                
                return (
                  <div
                    key={residentKey}
                    onClick={() => !shouldBlur && setSelectedResidentKey(residentKey)}
                    className={cn(
                      "flex items-center gap-1.5 px-1.5 border-b border-border font-medium transition-colors",
                      isMobile ? "h-9 text-xs" : "h-10 text-sm gap-2 px-2",
                      shouldBlur 
                        ? "blur-sm select-none pointer-events-none opacity-50" 
                        : "cursor-pointer hover:bg-muted/50"
                    )}
                  >
                    <Avatar className={cn("flex-shrink-0", isMobile ? "w-5 h-5" : "w-6 h-6")}>
                      <AvatarImage src={avatarUrl} alt={nickname} />
                      <AvatarFallback className={cn(isMobile ? "text-[8px]" : "text-[10px]")}>
                        {nickname.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn("truncate", isMobile && "text-xs", !shouldBlur && "hover:underline")} title={nickname}>
                      {nickname}
                      {isCurrentUser && <span className="text-muted-foreground font-normal"> (you)</span>}
                    </span>
                    {!isMobile && firstStay?.social_profile && socialNetwork.type && !shouldBlur && (
                      <a
                        href={firstStay.social_profile}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={cn("flex-shrink-0 hover:opacity-70 transition-opacity", socialNetwork.color)}
                        title={`View ${nickname}'s profile`}
                      >
                        {socialNetwork.type === 'twitter' && <Twitter className="h-3.5 w-3.5" />}
                        {socialNetwork.type === 'instagram' && <Instagram className="h-3.5 w-3.5" />}
                        {socialNetwork.type === 'github' && <Github className="h-3.5 w-3.5" />}
                        {socialNetwork.type === 'linkedin' && <Linkedin className="h-3.5 w-3.5" />}
                        {socialNetwork.type === 'other' && <ExternalLink className="h-3.5 w-3.5" />}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Resize Handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 transition-colors"
              onMouseDown={handleResizeStart('name')}
            />
          </div>

          {/* Intention Column - Hidden on mobile */}
          {!isMobile && (
            <div
              className="flex-shrink-0 border-r border-border relative flex flex-col"
              style={{ width: intentionColumnWidth }}
            >
              {/* Header */}
              <div className="h-14 border-b border-border bg-muted/30 flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0">
                Intention
              </div>
              
              {/* Scrollable Intentions - synced with names */}
              <div 
                ref={intentionColumnRef}
                className="flex-1 overflow-y-auto overflow-x-hidden"
                onScroll={handleIntentionScroll}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
              {Array.from(staysByResident.entries()).map(([residentKey, group]) => {
                  const personStays = group.stays;
                  const firstStay = personStays[0];
                  const shouldBlur = shouldBlurStay(firstStay);
                  
                  return (
                    <div
                      key={residentKey}
                      className={cn(
                        "h-10 flex items-center px-2 border-b border-border text-sm text-muted-foreground",
                        shouldBlur && "blur-sm select-none pointer-events-none opacity-50"
                      )}
                    >
                      <span className="truncate" title={firstStay?.intention || ""}>
                        {firstStay?.intention || "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Resize Handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 transition-colors"
                onMouseDown={handleResizeStart('intention')}
              />
            </div>
          )}
        </div>

        {/* Timeline Grid */}
        <div 
          className="flex-1 overflow-auto" 
          ref={scrollContainerRef}
          onScroll={handleTimelineScroll}
        >
          <div style={{ width: days.length * dayWidth, minWidth: "100%" }}>
            {/* Month Headers */}
            <div className={cn("flex border-b border-border bg-muted/30 sticky top-0 z-10", isMobile ? "h-6" : "h-7")}>
              {monthHeaders.map(({ month, startIndex, span }, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "font-semibold text-foreground flex items-center justify-center border-r border-border",
                    isMobile ? "text-[10px]" : "text-xs"
                  )}
                  style={{ width: span * dayWidth, left: startIndex * dayWidth }}
                >
                  {isMobile ? format(month, "MMM yy") : format(month, "MMMM yyyy")}
                </div>
              ))}
            </div>

            {/* Day Headers */}
            <div className={cn("flex border-b border-border bg-muted/20 sticky top-7 z-10", isMobile ? "h-6" : "h-7")}>
              {days.map((day, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "text-center flex flex-col items-center justify-center border-r border-border/50",
                    isMobile ? "text-[8px]" : "text-[10px]",
                    isToday(day) && "bg-primary/20 font-bold"
                  )}
                  style={{ width: dayWidth }}
                >
                  {!isMobile && <span className="text-muted-foreground">{format(day, "EEE").slice(0, 1)}</span>}
                  <span>{format(day, "d")}</span>
                </div>
              ))}
            </div>

            {/* Stay Rows */}
            {Array.from(staysByResident.entries()).map(([residentKey, group]) => {
              const nickname = group.label;
              const personStays = group.stays;
              const firstStay = personStays[0];
              const shouldBlurRow = shouldBlurStay(firstStay);
              
              return (
              <div key={residentKey} className={cn(
                "relative border-b border-border", 
                isMobile ? "h-9" : "h-10",
                shouldBlurRow && "blur-sm opacity-50"
              )}>
                {/* Grid lines */}
                <div className="absolute inset-0 flex">
                  {days.map((day, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "h-full border-r border-border/30",
                        isToday(day) && "bg-primary/10"
                      )}
                      style={{ width: dayWidth }}
                    />
                  ))}
                </div>

                {/* Stay bars */}
                {personStays.map((stay) => {
                  const startDate = parseISO(stay.start_date);
                  const endDate = parseISO(stay.end_date);
                  const startOffset = differenceInDays(startDate, dateRange.start);
                  const duration = differenceInDays(endDate, startDate) + 1;
                  const colorStyle = getColorForNickname(nickname, stay.status);
                  const isPlanning = stay.status === "planning";
                  const isOwner = user?.id && stay.user_id === user.id;
                  const canEdit = (isOwner || isHost) && onEditStay && !shouldBlurRow;

                  const handleClick = (e: React.MouseEvent) => {
                    if (canEdit && onEditStay) {
                      e.preventDefault();
                      e.stopPropagation();
                      onEditStay(stay);
                    }
                  };

                  return (
                    <Tooltip key={stay.id}>
                      <TooltipTrigger asChild>
                        <div
                          onClick={handleClick}
                          className={cn(
                            "absolute rounded-md flex items-center justify-center text-white font-medium transition-all hover:brightness-110",
                            isMobile ? "top-1.5 h-6 text-[9px] px-1" : "top-1 h-8 text-xs px-2",
                            colorStyle.bg,
                            colorStyle.border,
                            colorStyle.opacity,
                            !isPlanning && "shadow-sm",
                            canEdit ? "cursor-pointer hover:ring-2 hover:ring-white/50" : "cursor-default"
                          )}
                          style={{
                            left: startOffset * dayWidth + 1,
                            width: duration * dayWidth - 2,
                          }}
                        >
                          <span className="truncate flex items-center gap-1">
                            {isPlanning && <span className="opacity-90">?</span>}
                            {isMobile ? `${duration}d` : `${stay.villa} · ${duration}d`}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{stay.nickname}</p>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                              isPlanning 
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" 
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            )}>
                              {isPlanning ? "Planning" : "Confirmed"}
                            </span>
                          </div>
                          <p className="text-muted-foreground">
                            {stay.villa} · {format(startDate, "MMM d")} – {format(endDate, "MMM d, yyyy")}
                          </p>
                          {stay.intention && (
                            <p className="text-sm"><strong>Intention:</strong> {stay.intention}</p>
                          )}
                          {stay.offerings && (
                            <p className="text-sm"><strong>Offers:</strong> {stay.offerings}</p>
                          )}
                          {stay.asks && (
                            <p className="text-sm"><strong>Asks:</strong> {stay.asks}</p>
                          )}
                          {stay.social_profile && (
                            <a
                              href={stay.social_profile}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Social Profile
                            </a>
                          )}
                          {canEdit && (
                            <p className="text-xs text-primary font-medium pt-1 border-t border-border mt-2 flex items-center gap-1">
                              Click to edit stay
                            </p>
                          )}
                          {isHost && onDeleteStay && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full mt-2 h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteStay(stay);
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove Submission
                            </Button>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
