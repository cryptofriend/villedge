import { useMemo, useRef, useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { CalendarCheck, ExternalLink, Twitter, Instagram, Github, Linkedin, Check, HelpCircle } from "lucide-react";
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
  onToggleStatus?: (stayId: string) => void;
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

export const StayGanttTimeline = ({ stays, loading, onToggleStatus }: StayGanttTimelineProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [nameColumnWidth, setNameColumnWidth] = useState(isMobile ? 100 : 120);
  const [intentionColumnWidth, setIntentionColumnWidth] = useState(140);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<'name' | 'intention' | null>(null);
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

  // Group stays by nickname
  const staysByNickname = useMemo(() => {
    const grouped = new Map<string, Stay[]>();
    stays.forEach((stay) => {
      const existing = grouped.get(stay.nickname) || [];
      grouped.set(stay.nickname, [...existing, stay]);
    });
    return grouped;
  }, [stays]);

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

  // Auto-scroll to today on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      jumpToToday();
    }, 100);
    return () => clearTimeout(timer);
  }, [days]);

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
      {/* Controls */}
      <div className="flex items-center justify-end gap-2 mb-3">
        <Button variant="outline" size="sm" onClick={jumpToToday} className="gap-2">
          <CalendarCheck className="h-4 w-4" />
          Jump to Today
        </Button>
      </div>

      {/* Occupancy Chart */}
      <div className="flex">
        <div style={{ width: nameColumnWidth }} className="flex-shrink-0" />
        <div className="flex-1 overflow-hidden">
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto"
            style={{ width: `calc(100%)` }}
          >
            <div style={{ width: days.length * dayWidth }}>
              <OccupancyChart stays={stays} dateRange={dateRange} dayWidth={dayWidth} />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex flex-1 min-h-0">
        {/* Name Column */}
        <div
          className="flex-shrink-0 border-r border-border relative"
          style={{ width: nameColumnWidth }}
        >
          {/* Month/Day header space */}
          <div className={cn(
            "border-b border-border bg-muted/30 sticky top-0 z-10 flex items-center justify-center font-semibold text-muted-foreground",
            isMobile ? "h-12 text-[10px]" : "h-14 text-xs"
          )}>
            Name
          </div>
          
          {/* Names */}
          <div className="overflow-y-auto">
            {Array.from(staysByNickname.entries()).map(([nickname, personStays]) => {
              const firstStay = personStays[0];
              const avatarUrl = getBestAvatar(nickname, firstStay?.social_profile || null, 32);
              const socialNetwork = getSocialNetwork(firstStay?.social_profile || null);
              
              return (
                <div
                  key={nickname}
                  className={cn(
                    "flex items-center gap-1.5 px-1.5 border-b border-border font-medium",
                    isMobile ? "h-9 text-xs" : "h-10 text-sm gap-2 px-2"
                  )}
                >
                  <Avatar className={cn("flex-shrink-0", isMobile ? "w-5 h-5" : "w-6 h-6")}>
                    <AvatarImage src={avatarUrl} alt={nickname} />
                    <AvatarFallback className={cn(isMobile ? "text-[8px]" : "text-[10px]")}>
                      {nickname.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn("truncate", isMobile && "text-xs")} title={nickname}>
                    {nickname}
                  </span>
                  {!isMobile && firstStay?.social_profile && socialNetwork.type && (
                    <a
                      href={firstStay.social_profile}
                      target="_blank"
                      rel="noopener noreferrer"
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
            className="flex-shrink-0 border-r border-border relative"
            style={{ width: intentionColumnWidth }}
          >
            {/* Header */}
            <div className="h-14 border-b border-border bg-muted/30 sticky top-0 z-10 flex items-center justify-center text-xs font-semibold text-muted-foreground">
              Intention
            </div>
            
            {/* Intentions */}
            <div className="overflow-y-auto">
              {Array.from(staysByNickname.entries()).map(([nickname, personStays]) => {
                const firstStay = personStays[0];
                
                return (
                  <div
                    key={nickname}
                    className="h-10 flex items-center px-2 border-b border-border text-sm text-muted-foreground"
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

        {/* Timeline Grid */}
        <div className="flex-1 overflow-x-auto" ref={scrollContainerRef}>
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
            {Array.from(staysByNickname.entries()).map(([nickname, personStays]) => (
              <div key={nickname} className={cn("relative border-b border-border", isMobile ? "h-9" : "h-10")}>
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
                  const canToggle = user?.id && stay.user_id === user.id && onToggleStatus;

                  const handleClick = (e: React.MouseEvent) => {
                    if (canToggle) {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleStatus(stay.id);
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
                            canToggle ? "cursor-pointer hover:ring-2 hover:ring-white/50" : "cursor-default"
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
                          {canToggle && (
                            <p className="text-xs text-primary font-medium pt-1 border-t border-border mt-2 flex items-center gap-1">
                              {isPlanning ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  Click to confirm
                                </>
                              ) : (
                                <>
                                  <HelpCircle className="h-3 w-3" />
                                  Click to set as planning
                                </>
                              )}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
