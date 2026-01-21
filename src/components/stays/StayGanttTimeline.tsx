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
import { CalendarCheck, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StayGanttTimelineProps {
  stays: Stay[];
  loading: boolean;
}

// Generate consistent colors based on nickname
const getColorForNickname = (nickname: string): string => {
  const colors = [
    "bg-emerald-500",
    "bg-blue-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-pink-500",
  ];
  
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

export const StayGanttTimeline = ({ stays, loading }: StayGanttTimelineProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [nameColumnWidth, setNameColumnWidth] = useState(120);
  const [isResizing, setIsResizing] = useState(false);
  const dayWidth = 28;

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
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = nameColumnWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX;
      setNameColumnWidth(Math.max(80, Math.min(200, startWidth + diff)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
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
          <div className="h-14 border-b border-border bg-muted/30 sticky top-0 z-10" />
          
          {/* Names */}
          <div className="overflow-y-auto">
            {Array.from(staysByNickname.entries()).map(([nickname, personStays]) => (
              <div
                key={nickname}
                className="h-10 flex items-center px-2 border-b border-border text-sm font-medium truncate"
                title={nickname}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full mr-2 flex-shrink-0",
                    getColorForNickname(nickname)
                  )}
                />
                {nickname}
              </div>
            ))}
          </div>

          {/* Resize Handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 transition-colors"
            onMouseDown={handleResizeStart}
          />
        </div>

        {/* Timeline Grid */}
        <div className="flex-1 overflow-x-auto" ref={scrollContainerRef}>
          <div style={{ width: days.length * dayWidth, minWidth: "100%" }}>
            {/* Month Headers */}
            <div className="flex h-7 border-b border-border bg-muted/30 sticky top-0 z-10">
              {monthHeaders.map(({ month, startIndex, span }, idx) => (
                <div
                  key={idx}
                  className="text-xs font-semibold text-foreground flex items-center justify-center border-r border-border"
                  style={{ width: span * dayWidth, left: startIndex * dayWidth }}
                >
                  {format(month, "MMMM yyyy")}
                </div>
              ))}
            </div>

            {/* Day Headers */}
            <div className="flex h-7 border-b border-border bg-muted/20 sticky top-7 z-10">
              {days.map((day, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "text-[10px] text-center flex flex-col items-center justify-center border-r border-border/50",
                    isToday(day) && "bg-primary/20 font-bold"
                  )}
                  style={{ width: dayWidth }}
                >
                  <span className="text-muted-foreground">{format(day, "EEE").slice(0, 1)}</span>
                  <span>{format(day, "d")}</span>
                </div>
              ))}
            </div>

            {/* Stay Rows */}
            {Array.from(staysByNickname.entries()).map(([nickname, personStays]) => (
              <div key={nickname} className="relative h-10 border-b border-border">
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

                  return (
                    <Tooltip key={stay.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute top-1 h-8 rounded-md flex items-center justify-center text-white text-xs font-medium px-2 cursor-pointer transition-all hover:brightness-110 shadow-sm",
                            getColorForNickname(nickname)
                          )}
                          style={{
                            left: startOffset * dayWidth + 2,
                            width: duration * dayWidth - 4,
                          }}
                        >
                          <span className="truncate">
                            {stay.villa} · {duration}d
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-semibold">{stay.nickname}</p>
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
