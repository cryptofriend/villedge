import { useMemo, useState } from "react";
import { format, parseISO, eachDayOfInterval, isToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, isSameMonth, isSameWeek } from "date-fns";
import { Stay } from "@/hooks/useStays";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ZoomLevel = "day" | "week" | "month";

interface OccupancyChartProps {
  stays: Stay[];
  dateRange: { start: Date; end: Date };
  dayWidth: number;
}

export const OccupancyChart = ({ stays, dateRange, dayWidth }: OccupancyChartProps) => {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("month");

  // Calculate occupancy data based on zoom level
  const { data, labels, periodWidth } = useMemo(() => {
    if (zoomLevel === "day") {
      const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      const dayData = days.map((day) => {
        const count = stays.filter((stay) => {
          const startDate = parseISO(stay.start_date);
          const endDate = parseISO(stay.end_date);
          return day >= startDate && day <= endDate;
        }).length;
        return { date: day, count, label: format(day, "d"), fullLabel: format(day, "MMM d") };
      });
      return { data: dayData, labels: dayData, periodWidth: dayWidth };
    }
    
    if (zoomLevel === "week") {
      const weeks = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end }, { weekStartsOn: 1 });
      const weekData = weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        // Get max occupancy during the week
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        const maxCount = Math.max(...days.map((day) => {
          return stays.filter((stay) => {
            const startDate = parseISO(stay.start_date);
            const endDate = parseISO(stay.end_date);
            return day >= startDate && day <= endDate;
          }).length;
        }), 0);
        const isCurrent = isSameWeek(new Date(), weekStart, { weekStartsOn: 1 });
        return { 
          date: weekStart, 
          count: maxCount, 
          label: format(weekStart, "d"), 
          fullLabel: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
          isCurrent
        };
      });
      return { data: weekData, labels: weekData, periodWidth: 40 };
    }
    
    // Month view
    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    const monthData = months.map((monthStart) => {
      const monthEnd = endOfMonth(monthStart);
      // Get max occupancy during the month
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      const maxCount = Math.max(...days.map((day) => {
        return stays.filter((stay) => {
          const startDate = parseISO(stay.start_date);
          const endDate = parseISO(stay.end_date);
          return day >= startDate && day <= endDate;
        }).length;
      }), 0);
      const isCurrent = isSameMonth(new Date(), monthStart);
      return { 
        date: monthStart, 
        count: maxCount, 
        label: format(monthStart, "MMM"), 
        fullLabel: format(monthStart, "MMMM yyyy"),
        isCurrent
      };
    });
    return { data: monthData, labels: monthData, periodWidth: 60 };
  }, [stays, dateRange, zoomLevel, dayWidth]);

  const maxOccupancy = useMemo(() => {
    return Math.max(...data.map((d) => d.count), 1);
  }, [data]);

  const chartHeight = 80;

  return (
    <div className="mb-4">
      {/* Zoom Controls */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">Occupancy Overview</span>
        <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
          {(["month", "week", "day"] as ZoomLevel[]).map((level) => (
            <Button
              key={level}
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(level)}
              className={cn(
                "h-6 px-2.5 text-xs font-medium transition-all",
                zoomLevel === level 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative bg-muted/20 rounded-lg p-3 overflow-x-auto">
        <div className="flex items-end gap-1" style={{ height: chartHeight, minWidth: data.length * (periodWidth + 4) }}>
          {/* Y-axis labels */}
          <div className="absolute left-2 top-3 bottom-8 flex flex-col justify-between text-[10px] text-muted-foreground w-6">
            <span>{maxOccupancy}</span>
            <span>{Math.round(maxOccupancy / 2)}</span>
            <span>0</span>
          </div>
          
          {/* Bars */}
          <div className="ml-8 flex items-end gap-1 flex-1">
            {data.map((item, index) => {
              const barHeight = (item.count / maxOccupancy) * (chartHeight - 20);
              const isCurrent = 'isCurrent' in item ? item.isCurrent : isToday(item.date);
              
              return (
                <div
                  key={index}
                  className="flex flex-col items-center gap-1"
                  style={{ width: periodWidth }}
                >
                  <div
                    className={cn(
                      "w-full rounded-t-md transition-all relative group cursor-default",
                      isCurrent
                        ? "bg-primary shadow-md"
                        : item.count > 0
                        ? "bg-primary/50 hover:bg-primary/60"
                        : "bg-muted/40"
                    )}
                    style={{ height: Math.max(barHeight, 4) }}
                    title={`${item.fullLabel}: ${item.count} ${item.count === 1 ? "person" : "people"}`}
                  >
                    {/* Value label on hover */}
                    {item.count > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-1 rounded">
                        {item.count}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] truncate text-center",
                    isCurrent ? "text-primary font-semibold" : "text-muted-foreground"
                  )} style={{ maxWidth: periodWidth }}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
