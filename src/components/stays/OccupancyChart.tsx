import { useMemo } from "react";
import { format, parseISO, eachDayOfInterval, isToday } from "date-fns";
import { Stay } from "@/hooks/useStays";
import { cn } from "@/lib/utils";

interface OccupancyChartProps {
  stays: Stay[];
  dateRange: { start: Date; end: Date };
  dayWidth: number;
  isMobile?: boolean;
}

export const OccupancyChart = ({ stays, dateRange, dayWidth, isMobile = false }: OccupancyChartProps) => {
  // Calculate daily occupancy data
  const data = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    return days.map((day) => {
      const count = stays.filter((stay) => {
        const startDate = parseISO(stay.start_date);
        const endDate = parseISO(stay.end_date);
        return day >= startDate && day <= endDate;
      }).length;
      return { date: day, count, label: format(day, "d"), fullLabel: format(day, "MMM d") };
    });
  }, [stays, dateRange]);

  const maxOccupancy = useMemo(() => {
    return Math.max(...data.map((d) => d.count), 1);
  }, [data]);

  const chartHeight = 80;

  return (
    <div className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">Occupancy Overview</span>
      </div>

      {/* Chart */}
      <div className="relative bg-muted/20 rounded-lg p-3">
        <div className="flex items-end" style={{ height: chartHeight }}>
          {/* Y-axis labels */}
          <div className="flex-shrink-0 flex flex-col justify-between text-[10px] text-muted-foreground w-6 h-full pb-5">
            <span>{maxOccupancy}</span>
            <span>{Math.round(maxOccupancy / 2)}</span>
            <span>0</span>
          </div>
          
          {/* Bars - full width with flex-1 */}
          <div className="flex items-end gap-0.5 flex-1 ml-2">
            {data.map((item, index) => {
              const barHeight = (item.count / maxOccupancy) * (chartHeight - 20);
              const isCurrent = isToday(item.date);
              
              return (
                <div
                  key={index}
                  className="flex flex-col items-center gap-1 flex-1 min-w-0"
                >
                  <div
                    className={cn(
                      "w-full max-w-[40px] mx-auto rounded-t-md transition-all relative group cursor-default",
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
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-1 rounded whitespace-nowrap">
                        {item.count}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] truncate text-center w-full",
                    isCurrent ? "text-primary font-semibold" : "text-muted-foreground"
                  )}>
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
